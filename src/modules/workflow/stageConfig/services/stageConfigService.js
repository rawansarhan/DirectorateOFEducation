'use strict'

const { findOrgDeptRole } = require('../../../organization/public')
const orgDeptRoleRepository = require('../../../organization/role/repositories/orgDeptRoleRepository')

const {
  createStageConfigSchema
} = require('../validations/stageConfigValidations')

const {
  validateStageConfigJson,
  ORG_DEP_ROLE_ASSIGNMENT_WIDGET_ID
} = require('../validations/stageConfigSchema')

const stageRepository = require('../../processDefinition/repositories/stageRepository')

const stageConfigRepository = require('../repositories/stageConfigRepository')

const stageAssignmentRepository = require('../repositories/stageAssignmentRepository')

const stageConfigMapper = require('../mappers/stageConfigMapper')

const typeDocRepository = require('../../../requirements/typeDoc/repositories/typeDocRepository')

const processRepository =
  require('../../processDefinition/repositories/processRepository')

const { validateStageAction } = require('../../actions/actionHelpers')


const {
  getOrLoad,
  KEYS,
  invalidateStageConfig,
  invalidateStageAssignments,
  invalidateProcessDefinitionDetails
} = require('../../../../core/cache/apiCacheService')

const { API_CACHE_TTL_SECONDS } = require('../../../../core/config/env')

const {
  HTTP_STATUS,
  createHttpError
} = require('../../../../core/middleware/httpStatusCodes')

const { retryWithBackoff } = require('../../../../core/utils/retryWithBackoff')

function formatJoiError (error) {
  const lines = error.details.map(d => {
    const path = d.path.length ? d.path.join('.') : 'body'
    return `${path}: ${d.message}`
  })

  return `بيانات الطلب غير صالحة — ${lines.join(' | ')}`
}

function throwBusinessError (message, statusCode = HTTP_STATUS.BAD_REQUEST) {
  const err = createHttpError(message, statusCode, 'VALIDATION_ERROR')
  err.expose = true
  throw err
}

// 0 / '0' / null تعني "لا يوجد" عند البحث عن الدور (مؤسسة/قسم عامّ)
const normalizeOrgId = (v) => (v === 0 || v === '0' || v == null ? null : v)

function hasDynamicOrgDepRoleDestination (configJson = {}) {
  if (configJson?.is_assignment === true) {
    return true
  }

  const widget = configJson?.assignments
  return (
    widget?.widget_type === 'dropdown' &&
    widget?.data?.id === ORG_DEP_ROLE_ASSIGNMENT_WIDGET_ID
  )
}

function isNullStageAssignment (assignment = {}) {
  const organizationId = normalizeOrgId(assignment.organization_id)
  const departmentId = normalizeOrgId(assignment.department_id)
  const roleId =
    assignment.role_id === 0 || assignment.role_id === '0' || assignment.role_id == null
      ? null
      : Number(assignment.role_id)

  return organizationId == null && departmentId == null && roleId == null
}

async function assertFilePickerTypeDocsExist (configJson = {}) {
  for (const widget of configJson.widgets || []) {
    if (widget.widget_type !== 'file_picker') {
      continue
    }

    const widgetId = widget.data?.id || 'file_picker'
    const typeDocId = Number(widget.data?.type_doc_id)

    if (!Number.isInteger(typeDocId) || typeDocId <= 0) {
      throwBusinessError(
        `الودجت "${widgetId}": type_doc_id مطلوب في file_picker`
      )
    }

    const typeDoc = await typeDocRepository.findById(typeDocId)

    if (!typeDoc) {
      throwBusinessError(
        `الودجت "${widgetId}": نوع الوثيقة (type_doc_id=${typeDocId}) غير موجود`
      )
    }

    if (typeDoc.is_active === false) {
      throwBusinessError(
        `الودجت "${widgetId}": نوع الوثيقة (type_doc_id=${typeDocId}) غير نشط`
      )
    }
  }
}

async function assertAssignmentsOptionsExist (stageId, assignmentsWidget) {
  const options = assignmentsWidget?.data?.options || []

  for (const option of options) {
    const key = String(option.key || '').trim()
    const orgDeptRole = await orgDeptRoleRepository.findActiveByCamundaGroupKey(key)

    if (!orgDeptRole) {
      throwBusinessError(
        `المرحلة ${stageId}: config_json.assignments — الخيار key="${key}" لا يطابق أي camunda_group_key نشط في organization_department_roles`
      )
    }
  }
}

// ======================================================
// CREATE STAGE CONFIG
// ======================================================

async function createStageConfigService (data) {
  // =====================================
  // NORMALIZE + VALIDATE config_json (widgets incl. file_picker.type_doc_id)
  // =====================================

  if (Array.isArray(data?.stages)) {
    data = {
      ...data,
      stages: data.stages.map(stage => {
        const { error, value } = validateStageConfigJson(stage.config_json || {})

        if (error) {
          throwBusinessError(formatJoiError(error))
        }

        return {
          ...stage,
          config_json: value
        }
      })
    }
  }

  // =====================================
  // VALIDATION
  // =====================================

  const { error, value } = createStageConfigSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  })

  if (error) {
    throwBusinessError(formatJoiError(error))
  }

  data = value

  // =====================================
  // LOAD STAGES ONCE
  // =====================================

  const stageIds = data.stages.map(s => s.stage_id)

  const stages = await stageRepository.findByIds(stageIds)

  const stageMap = new Map(stages.map(s => [s.id, s]))

  if (stages.length !== stageIds.length) {
    const found = new Set(stages.map(s => s.id))
    const missing = stageIds.filter(id => !found.has(id))
    throwBusinessError(
      `مرحلة غير موجودة: ${missing.join(', ')}`,
      HTTP_STATUS.NOT_FOUND
    )
  }

  const existingConfigs = await stageConfigRepository.findByStageIds(stageIds)

  if (existingConfigs.length > 0) {
    const taken = existingConfigs.map(c => c.stage_id).join(', ')
    throwBusinessError(
      `إعدادات المراحل التالية موجودة مسبقاً (stage_id): ${taken}`,
      HTTP_STATUS.CONFLICT
    )
  }

  // =====================================
  // LOAD EXISTING ASSIGNMENTS ONCE
  // =====================================

  const existingAssignments = await stageAssignmentRepository.findByStageIds(
    stageIds
  )

  const existingSet = new Set(
    existingAssignments.map(
      a => `${a.stage_id}_${a.organization_department_roles_id}`
    )
  )

  // =====================================
  // PREPARE BULK INSERTS
  // =====================================

  const configsToCreate = []

  const assignmentsToCreate = []

  const results = []

  // =====================================
  // LOOP STAGES
  // =====================================

  for (const item of data.stages) {
    const stage = stageMap.get(item.stage_id)

    const configActions = item.config_json?.actions

    if (stage.type === 'USER_TASK' && Array.isArray(configActions) && configActions.length) {
      throwBusinessError(
        `المرحلة ${item.stage_id}: actions لمهام USER_TASK تُرسل عند إكمال المهمة وليس في config_json`
      )
    }

    if (stage.type === 'SERVICE_TASK' && Array.isArray(configActions)) {
      for (const action of configActions) {
        const actionError = validateStageAction(action, item.stage_id)

        if (actionError) {
          throwBusinessError(actionError)
        }

        // SEND_NOTIFICATION: حوّل (organization_id, department_id, role_id)
        // إلى organization_department_roles_id ليعمل الإرسال الفعلي وقت التنفيذ
        if (action.name === 'SEND_NOTIFICATION') {
          const payload = action.payload || {}

          if (payload.role_id != null) {
            const orgDeptRole = await findOrgDeptRole({
              organization_id: normalizeOrgId(payload.organization_id),
              department_id: normalizeOrgId(payload.department_id),
              role_id: payload.role_id
            })

            if (!orgDeptRole) {
              throwBusinessError(
                `المرحلة ${item.stage_id}: SEND_NOTIFICATION — لم يتم العثور على دور (role_id=${payload.role_id}) للمؤسسة ${payload.organization_id} والقسم ${payload.department_id}`
              )
            }

            payload.to_organization_department_roles_id = orgDeptRole.id

            // نظّف الحقول المدخلة بعد تحويلها
            delete payload.organization_id
            delete payload.department_id
            delete payload.role_id

            action.payload = payload
          }
        }
      }
    }

    if (stage.type === 'USER_TASK') {
      const assignments = item.assignments || []
      const dynamicDestination = hasDynamicOrgDepRoleDestination(item.config_json)

      if (!assignments.length) {
        throwBusinessError(
          dynamicDestination
            ? `المرحلة ${item.stage_id} (USER_TASK): عند is_assignment=true أرسل assignments: [{ organization_id: null, department_id: null, role_id: null }]`
            : `المرحلة ${item.stage_id} (USER_TASK): يجب تحديد assignments (مؤسسة/قسم/دور)`
        )
      }

      if (dynamicDestination) {
        const allNull = assignments.every(isNullStageAssignment)

        if (!allNull) {
          throwBusinessError(
            `المرحلة ${item.stage_id}: عند is_assignment=true يجب أن تكون assignments كلها null — التوجيه يتم عبر POST /complete`
          )
        }
      } else if (assignments.some(isNullStageAssignment)) {
        throwBusinessError(
          `المرحلة ${item.stage_id}: assignments بـ null مسموحة فقط مع is_assignment=true`
        )
      }
    }

    await assertFilePickerTypeDocsExist(item.config_json)

    if (item.config_json?.assignments?.data?.options?.length) {
      await assertAssignmentsOptionsExist(item.stage_id, item.config_json.assignments)
    }

    // =================================
    // CONFIG
    // =================================

    configsToCreate.push({
      stage_id: item.stage_id,
      config_json: item.config_json
    })

    // =================================
    // USER TASK ASSIGNMENTS
    // =================================

    if (stage.type === 'USER_TASK') {
      const assignments = item.assignments || []
      const dynamicDestination = hasDynamicOrgDepRoleDestination(item.config_json)

      // توجيه ديناميكي عبر OrgDepRole في complete → لا تُحفظ stage_assignments
      if (!dynamicDestination) {
        for (const a of assignments) {
          if (isNullStageAssignment(a)) {
            continue
          }

          const orgDeptRole = await findOrgDeptRole({
            organization_id: normalizeOrgId(a.organization_id),
            department_id: normalizeOrgId(a.department_id),
            role_id: a.role_id
          })

          if (!orgDeptRole) {
            throwBusinessError(
              `لم يتم العثور على دور (role_id=${a.role_id}) للمؤسسة ${a.organization_id} والقسم ${a.department_id}`
            )
          }

          const existingKey = `${stage.id}_${orgDeptRole.id}`

          if (existingSet.has(existingKey)) {
            continue
          }

          assignmentsToCreate.push({
            stage_id: stage.id,
            organization_department_roles_id: orgDeptRole.id
          })

          existingSet.add(existingKey)
        }
      }
    }

    results.push({
      stage_id: stage.id,
      config: item.config_json
    })
  }

  // =====================================
  // BULK CREATE CONFIGS
  // =====================================

  if (configsToCreate.length > 0) {
    try {
      await stageConfigRepository.bulkCreate(configsToCreate)
    } catch (dbErr) {
      dbErr.expose = true
      throw dbErr
    }

    const processIds = new Set(
      stages
        .map(s => s.process_definition_id)
        .filter(Boolean)
    )

    for (const processId of processIds) {
      await invalidateStageConfig(processId)
    }
  }

  // =====================================
  // BULK CREATE ASSIGNMENTS
  // =====================================

  if (assignmentsToCreate.length > 0) {
    await stageAssignmentRepository.bulkCreate(assignmentsToCreate)

    const affectedStageIds = [
      ...new Set(assignmentsToCreate.map(item => item.stage_id).filter(Boolean))
    ]

    for (const stageId of affectedStageIds) {
      await invalidateStageAssignments(stageId)
    }

    if (configsToCreate.length === 0) {
      const processIds = new Set(
        stages
          .map(s => s.process_definition_id)
          .filter(Boolean)
      )

      for (const processId of processIds) {
        await invalidateProcessDefinitionDetails(processId)
      }
    }
  }

  return {
    message: 'Stages configured successfully',

    data: stageConfigMapper.mapConfigs(results)
  }
}

// ======================================================
// GET AUTH STAGE CONFIG (مواطن / موظف — استمارة التقديم)
// ======================================================

async function loadAuthStageConfigPayload (numericProcessId) {
  const process = await processRepository.findById(numericProcessId)

  if (!process) {
    throw createHttpError(
      'تعريف العملية غير موجود — تحقق من معرّف العملية',
      HTTP_STATUS.NOT_FOUND,
      'NOT_FOUND'
    )
  }

  const stage = await stageRepository.findFirstAuthStage(numericProcessId)

  if (!stage) {
    throw createHttpError(
      'لا توجد مرحلة تقديم (AUTH) مرتبطة بهذه العملية',
      HTTP_STATUS.NOT_FOUND,
      'NOT_FOUND'
    )
  }

  const stageConfig = await stageConfigRepository.findByStageId(stage.id)

  if (!stageConfig) {
    throw createHttpError(
      'لم تُكوَّن استمارة التقديم لهذه العملية بعد',
      HTTP_STATUS.NOT_FOUND,
      'NOT_FOUND'
    )
  }

  const configJson = stageConfig.config_json || {}

  if (configJson.is_assignment || configJson.assignments) {
    const { is_assignment, assignments, ...citizenConfig } = configJson
    return { config_json: citizenConfig }
  }

  return {
    config_json: configJson
  }
}

async function getConfig_json (processId, { userId } = {}) {
  const numericProcessId = Number(processId)

  if (!Number.isInteger(numericProcessId) || numericProcessId < 1) {
    throw createHttpError(
      'معرّف العملية غير صالح — يجب أن يكون رقماً صحيحاً موجباً',
      HTTP_STATUS.BAD_REQUEST,
      'VALIDATION_ERROR'
    )
  }

  const data = await getOrLoad(
    KEYS.stageConfig(numericProcessId),
    () => retryWithBackoff(
      () => loadAuthStageConfigPayload(numericProcessId),
      { label: 'stageConfig.getConfig_json' }
    ),
    {
      label: `stage-config:process:${numericProcessId}`,
      ttlSeconds: API_CACHE_TTL_SECONDS
    }
  )

  return {
    message: 'تم جلب إعدادات العملية بنجاح',
    data
  }
}
async function loadComplaintConfigPayload () {
  const activeComplaint = await processRepository.existsActiveComplaintProcess()

  if (!activeComplaint) {
    throw createHttpError(
      'لا توجد شكوى نشطة حالياً',
      HTTP_STATUS.NOT_FOUND,
      'NOT_FOUND'
    )
  }

  const stage = await stageRepository.findFirstAuthStage(activeComplaint.id)

  if (!stage) {
    throw createHttpError(
      'لا توجد مرحلة تقديم (AUTH) مرتبطة بعملية الشكوى',
      HTTP_STATUS.NOT_FOUND,
      'NOT_FOUND'
    )
  }

  const assignments = await stageAssignmentRepository.findByStageIds([stage.id])

  if (!assignments.length) {
    throw createHttpError(
      'لا توجد تعيينات لمرحلة التقديم في عملية الشكوى',
      HTTP_STATUS.NOT_FOUND,
      'NOT_FOUND'
    )
  }

  const stageConfig = await stageConfigRepository.findByStageId(stage.id)

  if (!stageConfig) {
    throw createHttpError(
      'لم تُكوَّن استمارة التقديم لعملية الشكوى بعد',
      HTTP_STATUS.NOT_FOUND,
      'NOT_FOUND'
    )
  }

  const configJson = stageConfig.config_json || {}
  let citizenConfig = configJson

  if (configJson.is_assignment || configJson.assignments) {
    const { is_assignment, assignments: _a, ...rest } = configJson
    citizenConfig = rest
  }

  return {
    process_definition_id: activeComplaint.id,
    process_name: activeComplaint.name,
    process_code: activeComplaint.code,
    assigned_odr_ids: assignments.map(a => a.organization_department_roles_id),
    config_json: citizenConfig
  }
}

async function getComplaintConfigForUser (userId) {
  const cacheKey = KEYS.complaintStageConfigActive()

  console.log(
    `[StageConfig] GET /api/stage_config/config/complaint — cache key: api:${cacheKey}`
  )

  const payload = await getOrLoad(
    cacheKey,
    () => retryWithBackoff(
      () => loadComplaintConfigPayload(),
      { label: 'stageConfig.getComplaintConfigForUser' }
    ),
    {
      label: 'stage-config:complaint:active',
      ttlSeconds: API_CACHE_TTL_SECONDS
    }
  )

  const { getUserRoles } = require('../../../auth/public')
  const userOdrIds = await getUserRoles(userId)
  const assignedOdrIds = new Set(payload.assigned_odr_ids || [])
  const hasAccess = userOdrIds.some(id => assignedOdrIds.has(id))

  if (!hasAccess) {
    throw createHttpError(
      'ليس لديك صلاحية تقديم شكوى — دورك غير مطابق لتعيينات مرحلة التقديم',
      HTTP_STATUS.FORBIDDEN,
      'FORBIDDEN'
    )
  }

  const { assigned_odr_ids: _assigned, ...data } = payload

  return {
    message: 'تم جلب استمارة الشكوى بنجاح',
    data
  }
}

module.exports = {
  createStageConfigService,
  getConfig_json,
  getComplaintConfigForUser
}
