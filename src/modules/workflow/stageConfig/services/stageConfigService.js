'use strict'

const orgDeptRolesClient = require('../../../../core/shared/clients/organization/orgDeptRolesClient')

const {
  createStageConfigSchema
} = require('../validations/stageConfigValidations')

const { validateStageConfigJson } = require('../validations/stageConfigSchema')

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
  invalidateProcessDefinitionDetails
} = require('../../../../core/cache/apiCacheService')

const { API_CACHE_TTL_SECONDS } = require('../../../../core/config/env')

const {
  HTTP_STATUS,
  createHttpError
} = require('../../../../core/middleware/httpStatusCodes')

const transactionRepository = require('../../../transaction/transaction/repositories/transactionRepository')
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

// 0 / '0' تعني "لا يوجد" عند البحث عن الدور (مؤسسة/قسم عامّ)
const normalizeOrgId = (v) => (v === 0 || v === '0' ? null : v)

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
            const orgDeptRole = await orgDeptRolesClient.findOrgDeptRole({
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

      if (!assignments.length) {
        throwBusinessError(
          `المرحلة ${item.stage_id} (USER_TASK): يجب تحديد assignments (مؤسسة/قسم/دور)`
        )
      }
    }

    await assertFilePickerTypeDocsExist(item.config_json)

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

      // =============================
      // CALL ORGANIZATION SERVICE
      // =============================

for (const a of assignments) {
  const orgDeptRole = await orgDeptRolesClient.findOrgDeptRole({
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

        // skip duplicate
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

  // let draft = null
  // if (userId) {
  //   draft = await transactionRepository.findDraftByCode(userId, process.code)
  // }
  // const config_json = draft?.data ?? stageConfig.config_json
  // const data = { config_json }
  // if (draft) {
  //   data.transaction_id = draft.id
  // }

  return {
    config_json: stageConfig.config_json
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
module.exports = {
  createStageConfigService,
  getConfig_json
}
