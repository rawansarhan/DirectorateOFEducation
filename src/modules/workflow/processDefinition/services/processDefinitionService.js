const {
  createProcessDefinitionSchema,
  validateProcess
} = require('../validations/processDefValidation')
const {
  getOrganizationById
} = require('../../../organization/public')
const {
  toAuthProcessResponse,
  toUnapprovedOrInactiveProcessItem,
  toProcessMissingStageConfigItem,
  toAdminProcessByTypeItem,
  processDetailsMapper
} = require('../mappers/processMapper')
const processRepository =
  require('../repositories/processRepository')

const typeTransRepository =
  require('../../typeProcess/repositories/typeTransRepository')

const camundaClient =
  require('../../../../core/shared/clients/camunda/camundaClient')
const stageRepository =
  require('../repositories/stageRepository')
  const {
  mapTasksToStages
} = require('../mappers/stageMapper')
const { getUserRoles } = require('../../../auth/public')
const {
  findAllOrgDeptRole
} = require('../../../organization/public')

const {
  isProcessActiveBySchedule
} = require('../utils/processActivation')
const {
  filterAuthProcessesByRoleIds
} = require('../utils/processAuthFilter')
const {
  invalidateAllProcessLists
} = require('../../../../core/cache/processCacheService')
const {
  getOrLoad,
  KEYS,
  invalidateProcessDefinitionsWithType,
  invalidateProcessDefinitionDetails
} = require('../../../../core/cache/apiCacheService')
const {
  PROCESS_CACHE_TTL_SECONDS,
  API_CACHE_TTL_SECONDS
} = require('../../../../core/config/env')
const {
  paginateArray,
  emptyPaginatedResult
} = require('../../../../core/utils/pagination')
const {
  formatJoiError,
  joiErrorDetails
} = require('../../../../core/utils/errorMessageHelper')
const {
  createHttpError,
  HTTP_STATUS
} = require('../../../../core/middleware/httpStatusCodes')

const LOG_PREFIX = '[ProcessDefinition]'

function sortAuthProcessesByPriority (processes = []) {
  return [...processes].sort(
    (a, b) => Number(a.priority) - Number(b.priority)
  )
}

/**
 * - is_complaint=true  → type_trans_id = null (شكوى)
 * - is_complaint=false → type_trans_id مطلوب (معاملة عادية)
 * - بعد الإنشاء: مسح كاش قوائم المعاملات
 */
async function createProcessDefinitionService (data) {
  console.log(`${LOG_PREFIX} createProcessDefinition name=${data.name}`)

  const { error } = createProcessDefinitionSchema.validate(data, {
    abortEarly: false
  })

  if (error) {
    const validationError = createHttpError(
      formatJoiError(error),
      HTTP_STATUS.BAD_REQUEST,
      'VALIDATION_ERROR'
    )
    validationError.expose = true
    validationError.details = joiErrorDetails(error)
    throw validationError
  }

  const isComplaint = Boolean(data.is_complaint)

  const [
    organization,
    typeProcess
  ] = await Promise.all([
    getOrganizationById(
      data.organization_id
    ),
    isComplaint
      ? Promise.resolve(null)
      : typeTransRepository.findById(data.type_trans_id)
  ])

  if (!organization) {
    throw new Error('المؤسسة المختارة غير موجودة')
  }

  if (!isComplaint && !typeProcess) {
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
  await invalidateProcessDefinitionsWithType()

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

  if (!process) throw createHttpError('العملية غير موجودة بعد الإنشاء', HTTP_STATUS.NOT_FOUND, 'NOT_FOUND')

  const tasks = await generateStagesFromCamunda(process)

  if (tasks.length === 0) {
    throw createHttpError(
      'لم يتم إنشاء أي مرحلة من ملف BPMN — تأكد أن الملف يحتوي userTask أو serviceTask',
      HTTP_STATUS.BAD_REQUEST,
      'VALIDATION_ERROR'
    )
  }
  return tasks
}

///// ============================== AUTH processes (bulk optimized) ====================================

function isAllAuthTypesRequest (typeTransID) {
  return Number(typeTransID) === 0
}

async function getAuthProcesses (
  typeTransID,
  userId,
  paginationInput
) {
  const allTypes = isAllAuthTypesRequest(typeTransID)
  let typeTrans = null

  if (!allTypes) {
    typeTrans = await typeTransRepository.findById(typeTransID)

    if (!typeTrans) {
      throw new Error('لا يوجد هذا النوع')
    }
  }

  const roleIds =
    await getUserRoles(userId)

  if (!roleIds || roleIds.length === 0) {
    return {
      message: 'لا يوجد صلاحيات للمستخدم',
      data: emptyPaginatedResult(paginationInput)
    }
  }

  const cacheKey = allTypes
    ? KEYS.authProcessesAll()
    : KEYS.authProcessesByType(typeTrans.id)

  console.log(
    `${LOG_PREFIX} GET /api/process_definitions/auth/${typeTransID} — cache key: api:${cacheKey}`
  )

  const cachedProcesses = await getOrLoad(
    cacheKey,
    () => allTypes
      ? processRepository.findAllAuthProcessesForCache()
      : processRepository.findAuthProcessesForCache(typeTrans.id),
    {
      label: `ProcessDefinition GET /api/process_definitions/auth/${typeTransID}`,
      ttlSeconds: PROCESS_CACHE_TTL_SECONDS
    }
  )

  const processes = sortAuthProcessesByPriority(
    filterAuthProcessesByRoleIds(cachedProcesses, roleIds)
  )

  const result = processes.map(toAuthProcessResponse)
  const { items, pagination } = paginateArray(result, paginationInput)

  return {
    message: 'تم جلب عمليات AUTH بنجاح',
    data: {
      items,
      pagination
    }
  }
}

async function getUnapprovedOrInactiveProcesses (paginationInput) {
  const rows = await processRepository.findUnapprovedOrInactiveProcesses()
  const items = rows.map(toUnapprovedOrInactiveProcessItem)
  const { items: pageItems, pagination } = paginateArray(items, paginationInput)

  return {
    message:
      'تم جلب العمليات غير الموافق عليها أو غير النشطة (جميع مراحلها لها stage_config)',
    data: {
      items: pageItems,
      pagination
    }
  }
}

async function getProcessesWithMissingStageConfig (paginationInput) {
  const rows = await processRepository.findProcessesWithMissingStageConfig()
  const items = rows.map(toProcessMissingStageConfigItem)
  const { items: pageItems, pagination } = paginateArray(items, paginationInput)

  return {
    message: 'تم جلب العمليات التي تحتوي مراحل بدون stage_config',
    data: {
      items: pageItems,
      pagination
    }
  }
}

async function getProcessesByTypeForAdmin (typeTransID, paginationInput) {
  const allTypes = isAllAuthTypesRequest(typeTransID)

  if (!allTypes) {
    const typeTrans = await typeTransRepository.findById(typeTransID)

    if (!typeTrans) {
      throw new Error('لا يوجد هذا النوع')
    }
  }

  const cacheKey = allTypes
    ? KEYS.adminProcessesAll()
    : KEYS.adminProcessesByType(Number(typeTransID))

  console.log(
    `${LOG_PREFIX} GET /api/process_definitions/admin/type/${typeTransID} — cache key: api:${cacheKey}`
  )

  const processes = await getOrLoad(
    cacheKey,
    () => allTypes
      ? processRepository.findAllProcessesForAdmin()
      : processRepository.findProcessesByTypeForAdmin(Number(typeTransID)),
    {
      label: `ProcessDefinition GET /api/process_definitions/admin/type/${typeTransID}`,
      ttlSeconds: PROCESS_CACHE_TTL_SECONDS
    }
  )

  const items = sortAuthProcessesByPriority(processes).map(
    toAdminProcessByTypeItem
  )
  const { items: pageItems, pagination } = paginateArray(items, paginationInput)

  return {
    message: allTypes
      ? 'تم جلب كل عمليات الأنواع بنجاح'
      : 'تم جلب عمليات النوع بنجاح',
    data: {
      items: pageItems,
      pagination
    }
  }
}

async function getComplaintProcessesForAdmin (paginationInput) {
  const cacheKey = KEYS.adminComplaintProcessesActive()

  console.log(
    `${LOG_PREFIX} GET /api/process_definitions/admin/complaints — cache key: api:${cacheKey}`
  )

  const processes = await getOrLoad(
    cacheKey,
    () => processRepository.findComplaintProcessesForAdmin({ activeOnly: true }),
    {
      label: 'ProcessDefinition GET /api/process_definitions/admin/complaints',
      ttlSeconds: PROCESS_CACHE_TTL_SECONDS
    }
  )

  const items = sortAuthProcessesByPriority(processes).map(process => ({
    ...toAdminProcessByTypeItem(process),
    is_complaint: true
  }))
  const { items: pageItems, pagination } = paginateArray(items, paginationInput)

  return {
    message: 'تم جلب عمليات الشكاوى النشطة بنجاح',
    data: {
      items: pageItems,
      pagination
    }
  }
}

async function getAllComplaintProcessesForAdmin (paginationInput) {
  const cacheKey = KEYS.adminComplaintProcessesAllStatuses()

  console.log(
    `${LOG_PREFIX} GET /api/process_definitions/admin/complaints/all — cache key: api:${cacheKey}`
  )

  const processes = await getOrLoad(
    cacheKey,
    () => processRepository.findComplaintProcessesForAdmin({ activeOnly: false }),
    {
      label: 'ProcessDefinition GET /api/process_definitions/admin/complaints/all',
      ttlSeconds: PROCESS_CACHE_TTL_SECONDS
    }
  )

  const items = sortAuthProcessesByPriority(processes).map(process => ({
    ...toAdminProcessByTypeItem(process),
    is_complaint: true
  }))
  const { items: pageItems, pagination } = paginateArray(items, paginationInput)

  return {
    message: 'تم جلب كل عمليات الشكاوى بنجاح',
    data: {
      items: pageItems,
      pagination
    }
  }
}
//==================================================================================
//==================================get details for process=========================


async function loadProcessDetailsWithValidation (processId) {

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
    await findAllOrgDeptRole({
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

  const mappedDetails = processDetailsMapper(process)

  return {
    message: validation.is_valid
      ? 'تم جلب تفاصيل العملية بنجاح'
      : 'تم جلب تفاصيل العملية — توجد ملاحظات على الإعداد',
    data: {
      ...mappedDetails,
      validation
    }
  }
}

async function getProcessDetailsWithValidation (processId) {
  const numericProcessId = parseInt(processId, 10)

  if (!Number.isInteger(numericProcessId) || numericProcessId < 1) {
    throw new Error('معرّف العملية غير صالح')
  }

  return getOrLoad(
    KEYS.processDefinitionDetails(numericProcessId),
    () => loadProcessDetailsWithValidation(numericProcessId),
    {
      label: `ProcessDefinition GET /api/process_definitions/${numericProcessId}/details`,
      ttlSeconds: API_CACHE_TTL_SECONDS
    }
  )
}
//=====================================================================================
//====================== review Process (APPROVE , REJECT) ============================

async function reviewProcess (
  processId,
  decision
) {
  const decisionMap = {
    APPROVE: 'APPROVED',
    REJECT: 'REJECTED'
  }

  const approvalStatus = decisionMap[decision]

  if (!approvalStatus) {
    throw new Error('قرار غير صالح')
  }

  const process = await processRepository.findById(processId)

  if (!process) {
    throw new Error('العملية غير موجودة')
  }

  // رفض → حذف قسري لـ process_definition (CASCADE للمراحل والإعدادات)
  if (decision === 'REJECT') {
    const deploymentId = process.camunda_deployment_id

    if (deploymentId) {
      try {
        await camundaClient.deleteDeployment(deploymentId, { cascade: true })
      } catch (error) {
        console.warn(
          `${LOG_PREFIX} review REJECT — فشل حذف نشر Camunda deployment=${deploymentId}: ${error.message}`
        )
      }
    }

    await processRepository.forceDeleteById(processId)

    console.log(
      `${LOG_PREFIX} review process id=${processId} decision=REJECT — force-deleted — invalidating caches...`
    )
    await invalidateAllProcessLists()
    await invalidateProcessDefinitionsWithType()
    await invalidateProcessDefinitionDetails(processId)

    return {
      message: 'تم رفض العملية وحذفها نهائياً',
      deleted: true,
      process_definition_id: Number(processId)
    }
  }

  const updatePayload = {
    approval_status: approvalStatus,
    is_active: isProcessActiveBySchedule(
      process.start_date,
      process.end_date
    )
  }

  await processRepository.update(processId, updatePayload)

  console.log(
    `${LOG_PREFIX} review process id=${processId} decision=${decision} — invalidating auth process caches...`
  )
  await invalidateAllProcessLists()
  await invalidateProcessDefinitionsWithType()
  await invalidateProcessDefinitionDetails(processId)

  return {
    message: 'تمت الموافقة على العملية',
    deleted: false,
    process_definition_id: Number(processId)
  }
}


//////////////////////////////////////

module.exports = {
  setupProcessAfterCreation,
  createProcessDefinitionService,
  getAuthProcesses,
  getUnapprovedOrInactiveProcesses,
  getProcessesWithMissingStageConfig,
  getProcessesByTypeForAdmin,
  getComplaintProcessesForAdmin,
  getAllComplaintProcessesForAdmin,
  getProcessDetailsWithValidation,
  reviewProcess
}
