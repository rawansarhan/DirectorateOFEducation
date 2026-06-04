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
  isProcessActiveBySchedule
} = require('../utils/processActivation')
const {
  invalidateAllProcessLists
} = require('../../../core/cache/processCacheService')

const LOG_PREFIX = '[ProcessDefinition]'

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

  // parallel execution
  const [
    organization,
    typeProcess
  ] = await Promise.all([

    organizationClient.getOrganizationById(
      data.organization_id
    ),

    typeTransRepository.findById(
      data.type_trans_id
    )
  ])

  // business validation
  if (!organization) {
    throw new Error('المؤسسة المختارة غير موجودة')
  }

  if (!typeProcess) {
    throw new Error('نوع العملية غير موجود')
  }

  // camunda deploy
  const deployRes =
    await camundaClient.deployProcess(
      data.filePath
    )

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

async function getAuthProcesses(
  typeTransID,
  userId
) {

  // validate type transaction

  const typeTrans =
    await typeTransRepository.findById(
      typeTransID
    )

  if (!typeTrans) {
    throw new Error('لا يوجد هذا النوع')
  }

  // get user role ids from auth-service

  const roleIds =
    await authClient.getUserRoles(
      userId
    )

  // no permissions

  if (!roleIds || roleIds.length === 0) {

    return {
      message: 'لا يوجد صلاحيات للمستخدم',
      data: []
    }
  }

  // optimized repository query

  const processes =
    await processRepository.findAuthProcesses(
      typeTrans.id,
      roleIds
    )

  // mapping response



const result = processes.map(
  toAuthProcessResponse
)

  // response

  return {

    message: 'تم جلب عمليات AUTH بنجاح',

    data: result
  }
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
  getProcessDetailsWithValidation,
  reviewProcess
}
