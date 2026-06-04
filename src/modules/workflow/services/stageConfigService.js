'use strict'
const orgDeptRolesClient = require('../../../core/shared/clients/organization/orgDeptRolesClient')

const {
  createStageConfigSchema
} = require('../validations/stageConfigValidations')

const stageRepository = require('../repositories/stageRepository')

const stageConfigRepository = require('../repositories/stageConfigRepository')

const stageAssignmentRepository = require('../repositories/stageAssignmentRepository')

const stageConfigMapper = require('../mappers/stageConfigMapper')

const processRepository =
  require('../repositories/processRepository')

const {
  invalidateAllProcessLists
} = require('../../../core/cache/processCacheService')

const {
  getOrLoad,
  KEYS,
  invalidateStageConfig
} = require('../../../core/cache/apiCacheService')

const {
  HTTP_STATUS,
  createHttpError
} = require('../../../core/middleware/httpStatusCodes')

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

// ======================================================
// CREATE STAGE CONFIG
// ======================================================

async function createStageConfigService (data) {
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

    const uiKeys = Object.keys(item.ui_json || {})

    if (uiKeys.length > 0) {
      throwBusinessError(
        `المرحلة ${item.stage_id}: ui_json يجب أن يكون فارغاً {}`
      )
    }

    if (stage.type === 'SERVICE_TASK' && Array.isArray(configActions)) {
      for (const action of configActions) {
        if (!action?.name) {
          throwBusinessError(
            `المرحلة ${item.stage_id}: كل action في config_json يحتاج name`
          )
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

    // =================================
    // CONFIG
    // =================================

    configsToCreate.push({
      stage_id: item.stage_id,
      config_json: item.config_json,
      ui_json: item.ui_json || {}
    })

    // =================================
    // USER TASK ASSIGNMENTS
    // =================================

    if (stage.type === 'USER_TASK') {
      const assignments = item.assignments || []

      // =============================
      // CALL ORGANIZATION SERVICE
      // =============================

 const normalize = (v) => (v === 0 || v === '0' ? null : v)

for (const a of assignments) {
  const orgDeptRole = await orgDeptRolesClient.findOrgDeptRole({
    organization_id: normalize(a.organization_id),
    department_id: normalize(a.department_id),
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
      config: item.config_json,
      ui: item.ui_json || {}
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
    await invalidateAllProcessLists()
  }

  return {
    message: 'Stages configured successfully',

    data: stageConfigMapper.mapConfigs(results)
  }
}

// ======================================================
// GET AUTH STAGE UI (مواطن / موظف — الأوراق المطلوبة)
// ======================================================

function buildAuthStageUiJson (stageConfig) {
  const stored = stageConfig?.ui_json || {}

  if (stored && Object.keys(stored).length > 0) {
    return stored
  }

  const cfg = stageConfig?.config_json || {}

  return {
    fields: cfg.fields || [],
    files: cfg.files || [],
    templates: cfg.templates || []
  }
}

async function getConfig_json (processID) {
  const processId = parseInt(processID, 10)

  if (!Number.isInteger(processId) || processId < 1) {
    throw createHttpError('معرّف العملية غير صالح', HTTP_STATUS.BAD_REQUEST)
  }

  return getOrLoad(
    KEYS.stageConfig(processId),
    async () => {
      const process = await processRepository.findById(processId)

      if (!process) {
        throw createHttpError('لم يتم ايجاد العملية', HTTP_STATUS.NOT_FOUND)
      }

      const stage = await stageRepository.findFirstAuthStage(processId)

      if (!stage) {
        throw createHttpError('لا توجد مرحلة لهذه العملية', HTTP_STATUS.NOT_FOUND)
      }

      const stageConfig = await stageConfigRepository.findByStageId(stage.id)

      if (!stageConfig) {
        throw createHttpError('لم نجد إعدادات للمرحلة', HTTP_STATUS.NOT_FOUND)
      }

      return {
        ui_json: buildAuthStageUiJson(stageConfig)
      }
    },
    { label: `GET /api/stage_config/config/${processId}` }
  )
}

module.exports = {
  createStageConfigService,
  getConfig_json
}
