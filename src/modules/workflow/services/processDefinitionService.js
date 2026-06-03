const {
  createProcessDefinitionSchema,
  validateProcess
} = require('../validations/processDefValidation')
const organizationClient =
  require('../../../core/shared/clients/organization/organizationClient')
const {
  toAuthProcessResponse,
  processDetailsMapper
} = require('../mappers/processMapper')
const processRepository =
  require('../repositories/processRepository')

const typeTransRepository =
  require('../repositories/typeTransRepository')

const camundaClient =
  require('../../../core/shared/clients/camunda/camundaClient')
const stageRepository =
  require('../repositories/stageRepository')
  const {
  mapTasksToStages
} = require('../mappers/stageMapper')
const authClient =
  require('../../../core/shared/clients/auth/authClient')
const orgDeptRolesClient = require('../../../core/shared/clients/organization/orgDeptRolesClient')
const {
  buildRoleKey,
  getOrLoadProcessList,
  getOrLoadCitizenOdrId,
  invalidateAllProcessLists
} = require('../../../core/cache/processCacheService')

const {
  isProcessActiveBySchedule
} = require('../utils/processActivation')

const LOG_PREFIX = '[ProcessDefinition]'

/** تحويل is_complaint من multipart/form (string/boolean) */
function parseBoolean (value) {
  return value === true || value === 'true' || value === 1 || value === '1'
}

/**
 * - is_complaint=true  → type_trans_id = null (شكوى)
 * - is_complaint=false → type_trans_id مطلوب (معاملة عادية)
 * - بعد الإنشاء: مسح كاش قوائم المعاملات
 */
async function createProcessDefinitionService (data) {
  console.log(`${LOG_PREFIX} createProcessDefinition name=${data.name}`)

  const { error } = createProcessDefinitionSchema.validate(data)

  if (error) {
    throw new Error(error.details[0].message)
  }

  const isComplaint = parseBoolean(data.is_complaint)
  console.log(
    `${LOG_PREFIX} is_complaint=${isComplaint} type_trans_id=${isComplaint ? 'null' : data.type_trans_id}`
  )

  const organization = await organizationClient.getOrganizationById(
    data.organization_id
  )

  if (!organization) {
    throw new Error('المؤسسة المختارة غير موجودة')
  }

  if (!isComplaint) {
    const typeProcess = await typeTransRepository.findById(data.type_trans_id)

    if (!typeProcess) {
      throw new Error('نوع العملية غير موجود')
    }
  }

  console.log(`${LOG_PREFIX} deploying BPMN → Camunda...`)
  const deployRes = await camundaClient.deployProcess(data.filePath)

  const version = 1

  const process = await processRepository.create({
    name: data.name,
    camunda_process_key: deployRes.processKey,
    camunda_deployment_id: deployRes.deploymentId,
    is_complaint: isComplaint,
    type_trans_id: isComplaint ? null : data.type_trans_id,
    organization_id: data.organization_id || null,
    status: 'deployed',
    version,
    priority: data.priority,
    start_date: data.start_date,
    end_date: data.end_date
  })

  await process.reload()

  console.log(
    `${LOG_PREFIX} created process id=${process.id} code=${process.code} — invalidating cache...`
  )
  await invalidateAllProcessLists()

  return process
}

///////////////////////////////////////////////////////////////////////////////
//==========================  generated  Stages   ======================
//////////////////////////////////////////////////////////////////////////////

async function generateStagesFromCamunda(process) {

  const tasks =
    await camundaClient.getProcessTasks(
      process.camunda_process_key
    )

  const existingCodesArray =
    await stageRepository.findCodesByProcessId(
      process.id
    )

  const existingCodes =
    new Set(existingCodesArray)

  const stagesToCreate =
    mapTasksToStages(
      tasks,
      process.id,
      existingCodes
    )

  if (stagesToCreate.length === 0) {
    return []
  }

  return await stageRepository.bulkCreate(
    stagesToCreate
  )
}

async function setupProcessAfterCreation (processId) {
  console.log(processId)
  const process = await processRepository.findById(processId)

  if (!process) throw new Error('Process not found')

  const tasks = await generateStagesFromCamunda(process)

  if (tasks.length === 0) throw new Error('لم يتم انشاء اي مرحلة')
  return tasks
}

///// ============================== AUTH processes (bulk optimized) ====================================

/**
 * جلب معاملات AUTH حسب نوع المعاملة (type_trans_id)
 * للموظفين — يفلتر حسب أدوار المستخدم + كاش Redis
 */
async function getAuthProcesses (typeTransID, userId) {
  console.log(`${LOG_PREFIX} getAuthProcesses typeTransID=${typeTransID} userId=${userId}`)

  const typeTrans = await typeTransRepository.findById(typeTransID)

  if (!typeTrans) {
    throw new Error('لا يوجد هذا النوع')
  }

  const roleIds = await authClient.getUserRoles(userId)

  if (!roleIds || roleIds.length === 0) {
    console.log(`${LOG_PREFIX} no roles for userId=${userId}`)
    return {
      message: 'لا يوجد صلاحيات للمستخدم',
      data: [],
      from_cache: false
    }
  }

  const cacheKey = `type:${typeTrans.id}:roles:${buildRoleKey(roleIds)}`

  return getOrLoadProcessList(
    cacheKey,
    async () => {
      const processes = await processRepository.findAuthProcessesByType(
        typeTrans.id,
        roleIds
      )

      return {
        message: 'تم جلب المعاملات  بنجاح',
        data: processes.map(toAuthProcessResponse)
      }
    },
    { label: `AUTH processes — type_trans_id=${typeTrans.id}` }
  )
}

/**
 * resolve organization_department_roles.id لدور CITIZEN
 * (organization_id=null, department_id=null, role.code=CITIZEN)
 */
async function resolveCitizenOrgDeptRoleId () {
  return getOrLoadCitizenOdrId(() => orgDeptRolesClient.getCitizenRole())
}

/**
 * جلب معاملات المواطن حسب النوع
 * - is_complaint = false
 * - stage AUTH مربوط بدور CITIZEN
 */
async function getCitizenAuthProcessesByType (typeTransID) {
  console.log(`${LOG_PREFIX} getCitizenAuthProcessesByType typeTransID=${typeTransID}`)

  const typeTrans = await typeTransRepository.findById(typeTransID)

  if (!typeTrans) {
    throw new Error('لا يوجد هذا النوع')
  }

  const citizenOdrId = await resolveCitizenOrgDeptRoleId()
  const cacheKey = `citizen:type:${typeTrans.id}:odr:${citizenOdrId}`

  return getOrLoadProcessList(
    cacheKey,
    async () => {
      const processes = await processRepository.findAuthProcessesByType(
        typeTrans.id,
        [citizenOdrId]
      )

      return {
        message: 'تم جلب المعاملات  بنجاح',
        data: processes.map(toAuthProcessResponse)
      }
    },
    { label: `citizen processes — type_trans_id=${typeTrans.id}` }
  )
}

//==================================================================================
//==================================get details for process=========================


async function getProcessDetailsWithValidation(processId) {

  const process =
    await processRepository.findProcessDetails(processId)

  if (!process) {
    throw new Error('العملية غير موجودة')
  }

  // استخراج role ids

  const roleIds = [
    ...new Set(
      process.stages.flatMap(stage =>
        stage.stage_assignments.map(
          a => a.organization_department_roles_id
        )
      )
    )
  ]

  // جلب roles من organization-service

  const roles =
    await orgDeptRolesClient.findAllOrgDeptRole({
      ids: roleIds
    })

  // map

  const roleMap = new Map(
    roles.map(role => [role.id, role])
  )

  // attach roles

  process.stages.forEach(stage => {

    stage.stage_assignments.forEach(assign => {

      assign.organization_department_role =
        roleMap.get(
          assign.organization_department_roles_id
        ) || null
    })
  })

  // validation

  const validation =
    validateProcess(process)

  if (!validation.is_valid) {

    return {
      message: 'العملية غير صالحة',

      data: {
        validation
      }
    }
  }

  return {

    message:
      'تم جلب تفاصيل العملية بنجاح',

    data: {

      ...processDetailsMapper(process),

      validation: {
        is_valid: true,
        errors: []
      }
    }
  }
}
//=====================================================================================
//====================== review Process (APPROVE , REJECT) ============================

async function reviewProcess(
  processId,
  decision
) {

  // validate decision

  const decisionMap = {
    APPROVE: 'APPROVED',
    REJECT: 'REJECTED'
  }

  const approvalStatus =
    decisionMap[decision]

  if (!approvalStatus) {
    throw new Error('قرار غير صالح')
  }

  // get process

  const process =
    await processRepository.findById(
      processId
    )

  if (!process) {
    throw new Error('العملية غير موجودة')
  }

  const updatePayload = {
    approval_status: approvalStatus
  }

  if (decision === 'APPROVE') {
    updatePayload.is_active = isProcessActiveBySchedule(
      process.start_date,
      process.end_date
    )
  } else {
    updatePayload.is_active = false
  }

  await processRepository.update(processId, updatePayload)

  console.log(`${LOG_PREFIX} review process id=${processId} → ${approvalStatus} — invalidating cache...`)
  await invalidateAllProcessLists()

  return {
    message:
      decision === 'APPROVE'
        ? 'تمت الموافقة على العملية'
        : 'تم رفض العملية'
  }
}


//////////////////////////////////////

module.exports = {
  setupProcessAfterCreation,
  createProcessDefinitionService,
  getAuthProcesses,
  getCitizenAuthProcessesByType,
  getProcessDetailsWithValidation,
  reviewProcess
}
