'use strict'
const orgDeptRolesClient = require('../../../core/shared/clients/organization/orgDeptRolesClient')
const { re } = require('mathjs')
;('use strict')

const {
  createStageConfigSchema
} = require('../validations/stageConfigValidations')

const stageRepository = require('../repositories/stageRepository')

const stageConfigRepository = require('../repositories/stageConfigRepository')

const stageAssignmentRepository = require('../repositories/stageAssignmentRepository')

const stageConfigMapper = require('../mappers/stageConfigMapper')

const processRepository =
  require('../repositories/processRepository')
// ======================================================
// CREATE STAGE CONFIG
// ======================================================

async function createStageConfigService (data) {
  // =====================================
  // VALIDATION
  // =====================================

  const { error } = createStageConfigSchema.validate(data)

  if (error) {
    throw new Error(error.details[0].message)
  }

  // =====================================
  // LOAD STAGES ONCE
  // =====================================

  const stageIds = data.stages.map(s => s.stage_id)

  const stages = await stageRepository.findByIds(stageIds)

  const stageMap = new Map(stages.map(s => [s.id, s]))

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

    if (!stage) {
      throw new Error(`Stage ${item.stage_id} غير موجود`)
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
          throw new Error(
            `لم يتم العثور على role_id=${a.role_id}
             ضمن organization=${a.organization_id}
             department=${a.department_id}`
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
    await stageConfigRepository.bulkCreate(configsToCreate)
  }

  // =====================================
  // BULK CREATE ASSIGNMENTS
  // =====================================

  if (assignmentsToCreate.length > 0) {
    await stageAssignmentRepository.bulkCreate(assignmentsToCreate)
  }

  return {
    message: 'Stages configured successfully',

    data: stageConfigMapper.mapConfigs(results)
  }
}

// ======================================================
// GET CONFIG JSON
// ======================================================

async function getConfig_json (processID) {
  // =====================================
  // PROCESS
  // =====================================

  const process = await processRepository.findById(processID)

  if (!process) {
    return {
      message: 'لم يتم ايجاد العملية',

      data: {
        success: false,
        config_json: []
      }
    }
  }

  // =====================================
  // AUTH STAGE
  // =====================================

  const stage = await stageRepository.findFirstAuthStage(processID)

  if (!stage) {
    return {
      message: 'لا توجد مرحلة لهذه العملية',

      data: {
        success: false,
        config_json: []
      }
    }
  }

  // =====================================
  // CONFIG
  // =====================================

  const stageConfig = await stageConfigRepository.findByStageId(stage.id)

  if (!stageConfig) {
    return {
      message: 'لم نجد إعدادات للمرحلة',

      data: {
        success: false,
        config_json: []
      }
    }
  }

  return {
    message: 'تم جلب إعدادات العملية بنجاح',

    data: {
      success: true,

      config_json: stageConfig.config_json
    }
  }
}

module.exports = {
  createStageConfigService,
  getConfig_json
}
