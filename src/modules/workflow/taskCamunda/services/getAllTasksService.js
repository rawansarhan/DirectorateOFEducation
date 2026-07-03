'use strict'

const employeeTaskRepository = require('../repositories/employeeTaskRepository')
const processInstanceRepository = require('../repositories/processInstanceRepository')
const stageRepository = require('../../processDefinition/repositories/stageRepository')
const camundaClient = require('../../../../core/shared/clients/camunda/camundaClient')
const { toEmployeeTaskItem } = require('../mappers/taskCamundaMapper')
const {
  emptyPaginatedResult,
  emptyCursorPaginatedResult,
  buildPaginationMeta,
  buildCursorPaginationMeta,
  encodeCursor,
  decodeCursor
} = require('../../../../core/utils/pagination')
const { retryWithBackoff } = require('../../../../core/utils/retryWithBackoff')
const {
  KEYS,
  getOrLoad
} = require('../../../../core/cache/apiCacheService')
const { EMPLOYEE_TASKS_CACHE_TTL_SECONDS } = require('../../../../core/config/env')
const {
  resolveEmployeeTaskStatus,
  calculateProgressPercent,
  buildApplicantName
} = require('../utils/employeeTaskStatus')
const {
  releaseExpiredTaskLocksForProcessInstances
} = require('./taskLockService')
const {
  normalizeProcessPriority,
  formatTransactionDate
} = require('../utils/employeeTaskFormatters')

const EMPLOYEE_STATUS_FILTERS = {
  ALL_ACTIVE: 'all_active',
  IN_PROGRESS: 'in_progress',
  PENDING_PICKUP: 'pending_pickup'
}
//ا
async function buildProgressMaps (instances = []) {
  const transactionIds = instances
    .map(instance => instance.transaction?.id)
    .filter(Boolean)

  const processDefinitionIds = [
    ...new Set(instances.map(instance => instance.process_definition_id))
  ]

  const [stageCountMap, completedStageCountMap] = await Promise.all([
    employeeTaskRepository.countStagesByProcessDefinitionIds(
      processDefinitionIds
    ),
    employeeTaskRepository.countCompletedStagesByTransactionIds(
      transactionIds
    )
  ])

  return { stageCountMap, completedStageCountMap }
}

async function buildStageNameMap (instances = []) {
  const missingTransactionIds = instances
    .filter(instance => !instance.current_stage?.name && instance.transaction?.id)
    .map(instance => instance.transaction.id)

  if (!missingTransactionIds.length) {
    return new Map()
  }

  return employeeTaskRepository.getLatestStageNamesByTransactionIds(
    missingTransactionIds
  )
}

function resolveStageName (instance, activeTask, stageNameMap) {
  return (
    instance.current_stage?.name ||
    activeTask?.name ||
    stageNameMap.get(instance.transaction?.id) ||
    null
  )
}

function mapInstanceToTask ({
  instance,
  activeTask,
  userId,
  stageCountMap,
  completedStageCountMap,
  stageNameMap = new Map()
}) {
  const transaction = instance.transaction
  const totalStages = stageCountMap.get(instance.process_definition_id) || 0
  const completedStages = completedStageCountMap.get(transaction?.id) || 0
  const progressPercent = calculateProgressPercent(
    completedStages,
    totalStages
  )

  const employeeStatus = resolveEmployeeTaskStatus({
    transaction,
    processInstance: instance,
    activeTask,
    userId
  })

  return toEmployeeTaskItem({
    processInstance: instance,
    activeTask,
    userId,
    progressPercent,
    employeeStatus,
    stageNameOverride: resolveStageName(instance, activeTask, stageNameMap)
  })
}

function sortActiveInstances (instances = []) {
  return [...instances].sort((a, b) => {
    const priorityA = normalizeProcessPriority(a.process_definition?.priority)
    const priorityB = normalizeProcessPriority(b.process_definition?.priority)

    if (priorityA !== priorityB) {
      return priorityA - priorityB
    }

    const dateA = new Date(a.transaction?.created_at || a.created_at)
    const dateB = new Date(b.transaction?.created_at || b.created_at)

    return dateA - dateB
  })
}

function matchesEmployeeStatusFilter (item, employeeStatusFilter) {
  if (employeeStatusFilter === EMPLOYEE_STATUS_FILTERS.ALL_ACTIVE) {
    return (
      item.status === 'in_progress' ||
      item.status === 'pending_pickup'
    )
  }

  return item.status === employeeStatusFilter
}

async function fetchActiveCamundaTasks (camundaIds) {
  return retryWithBackoff(
    () => camundaClient.getActiveTasksByProcessInstanceIds(camundaIds),
    { label: 'Camunda.getActiveTasksByProcessInstanceIds' }
  )
}

async function resolveActiveStageForInstance (instance, activeTask) {
  if (!activeTask?.taskDefinitionKey) {
    return null
  }

  return stageRepository.findByCodeAndProcess(
    instance.process_definition_id,
    activeTask.taskDefinitionKey
  )
}

async function syncCurrentStageIfNeeded (instance, activeStage) {
  if (!activeStage?.id || instance.current_stage_id === activeStage.id) {
    return
  }

  await processInstanceRepository.update(instance.id, {
    current_stage_id: activeStage.id,
    task_lock_user_id: null,
    task_lock_task_id: null,
    task_locked_at: null,
    task_lock_expires_at: null
  })

  instance.current_stage_id = activeStage.id
  instance.task_lock_user_id = null
  instance.task_lock_task_id = null
  instance.task_locked_at = null
  instance.task_lock_expires_at = null

  if (instance.current_stage) {
    instance.current_stage.id = activeStage.id
    instance.current_stage.name = activeStage.name
    instance.current_stage.code = activeStage.code
  }
}

async function matchInstancesToUserStages ({
  instances,
  stageIds,
  taskMap,
  completedStageCodesMap = new Map()
}) {
  const matched = []

  for (const instance of instances) {
    const activeTask = taskMap.get(instance.camunda_process_instance_id)

    if (!activeTask) {
      continue
    }

    const activeStage = await resolveActiveStageForInstance(instance, activeTask)

    if (!activeStage || !stageIds.includes(activeStage.id)) {
      continue
    }

    const transactionId = instance.transaction?.id
    const completedCodes = transactionId
      ? completedStageCodesMap.get(transactionId)
      : null

    if (completedCodes?.has(activeStage.code)) {
      continue
    }

    await syncCurrentStageIfNeeded(instance, activeStage)

    matched.push({ instance, activeTask, activeStage })
  }

  return matched
}

async function loadEmployeeStageContext (userId) {
  const roleIds = await employeeTaskRepository.getUserRoleIds(userId)

  if (!roleIds.length) {
    return null
  }

  const context = await employeeTaskRepository.getAccessibleStageContext(roleIds)

  if (!context.stageIds.length) {
    return null
  }

  return context
}
//هذه الدالة لتحقق من المهمة الحالية اذا كانت اكبر من المهمة السابقة 
function isActivePairAfterCursor (pair, cursor) {
  const priority = normalizeProcessPriority(pair.instance.process_definition?.priority)
  const createdAt = new Date(
    pair.instance.transaction?.created_at || pair.instance.created_at
  )
  const id = pair.instance.id
  const cursorTime = new Date(cursor.t).getTime()

  if (priority > cursor.p) {
    return true
  }

  if (priority < cursor.p) {
    return false
  }

  if (createdAt.getTime() > cursorTime) {
    return true
  }

  if (createdAt.getTime() < cursorTime) {
    return false
  }

  return id > cursor.id
}
//هذذه الدالة لبناء المهمة الحالية 
function buildActiveTaskCursor (pair) {
  return encodeCursor({
    k: 'active',
    p: normalizeProcessPriority(pair.instance.process_definition?.priority),
    t: new Date(
      pair.instance.transaction?.created_at || pair.instance.created_at
    ).toISOString(),
    id: pair.instance.id
  })
}
// هذه الدالة لبناء المهمة السابقة 
function buildUserStageCursor (row) {
  return encodeCursor({
    k: 'stage',
    t: new Date(row.created_at).toISOString(),
    id: row.id
  })
}
//
async function getRunningTasks ({
  userId,
  stageIds,
  processDefinitionIds,
  limit,
  employeeStatusFilter = EMPLOYEE_STATUS_FILTERS.ALL_ACTIVE,
  cursor = null,
  decodedCursor = null,
  page = null,
  offset = null
}) {
  const instances =
    await employeeTaskRepository.getRunningInstancesForProcessDefinitions({
      processDefinitionIds
    })

  if (!instances.length) {
    return page != null
      ? emptyPaginatedResult({ page, limit })
      : emptyCursorPaginatedResult({ limit, cursor })
  }
//
  await releaseExpiredTaskLocksForProcessInstances(instances)
  
  const camundaIds = instances.map(
    instance => instance.camunda_process_instance_id
  )

  const taskMap = await fetchActiveCamundaTasks(camundaIds)

  const transactionIds = instances
    .map((instance) => instance.transaction?.id)
    .filter(Boolean)

  const completedStageCodesMap =
    await employeeTaskRepository.getCompletedStageCodesByTransactionIds(
      transactionIds
    )

  const matchedPairs = await matchInstancesToUserStages({
    instances,
    stageIds,
    taskMap,
    completedStageCodesMap
  })

  if (!matchedPairs.length) {
    return page != null
      ? emptyPaginatedResult({ page, limit })
      : emptyCursorPaginatedResult({ limit, cursor })
  }

  const sortedPairs = [...matchedPairs].sort((a, b) => {
    const priorityA = normalizeProcessPriority(
      a.instance.process_definition?.priority
    )
    const priorityB = normalizeProcessPriority(
      b.instance.process_definition?.priority
    )

    if (priorityA !== priorityB) {
      return priorityA - priorityB
    }

    const dateA = new Date(
      a.instance.transaction?.created_at || a.instance.created_at
    )
    const dateB = new Date(
      b.instance.transaction?.created_at || b.instance.created_at
    )

    return dateA - dateB
  })

  const sortedInstances = sortedPairs.map(pair => pair.instance)

  const { stageCountMap, completedStageCountMap } =
    await buildProgressMaps(sortedInstances)
  const stageNameMap = await buildStageNameMap(sortedInstances)

  const enrichedPairs = sortedPairs.map(pair => ({
    pair,
    item: mapInstanceToTask({
      instance: pair.instance,
      activeTask: pair.activeTask,
      userId,
      stageCountMap,
      completedStageCountMap,
      stageNameOverride: pair.activeTask?.name || pair.activeStage?.name || null
    })
  }))

  const filteredPairs = enrichedPairs.filter(({ item }) =>
    matchesEmployeeStatusFilter(item, employeeStatusFilter)
  )

  if (page != null) {
    const pageItems = filteredPairs
      .slice(offset, offset + limit)
      .map(entry => entry.item)

    return {
      items: pageItems,
      pagination: buildPaginationMeta({
        page,
        limit,
        total: filteredPairs.length
      })
    }
  }

  let startIndex = 0

  if (decodedCursor) {
    const idx = filteredPairs.findIndex(({ pair }) =>
      isActivePairAfterCursor(pair, decodedCursor)
    )
    startIndex = idx === -1 ? filteredPairs.length : idx
  }

  const slice = filteredPairs.slice(startIndex, startIndex + limit + 1)
  const hasNext = slice.length > limit
  const pageEntries = hasNext ? slice.slice(0, limit) : slice
  const nextCursor =
    hasNext && pageEntries.length
      ? buildActiveTaskCursor(pageEntries[pageEntries.length - 1].pair)
      : null

  return {
    items: pageEntries.map(entry => entry.item),
    pagination: buildCursorPaginationMeta({
      limit,
      cursor,
      nextCursor,
      hasNext
    })
  }
}

function mapUserStageToItem (row) {
  const transaction = row.transaction
  const user = transaction?.user
  const processInstance = transaction?.process_instance
  const processDefinition = processInstance?.process_definition
  const typeTrans = processDefinition?.type_trans
  const stageData = row.data || {}
  const decision = stageData.decision ?? stageData.value ?? null

  return {
    transaction_id: transaction?.id ?? null,
    transaction_number: transaction?.id_process ?? null,
    type: typeTrans?.name ?? processDefinition?.name ?? null,
    type_code: typeTrans?.code ?? null,
    applicant_name: buildApplicantName(transaction, user),
    process_name: processDefinition?.name ?? null,
    date: formatTransactionDate(transaction?.created_at),
    stage_code: row.stage_code ?? null,
    stage_name: row.stage_name ?? null,
    status: row.status,
    decision,
    transaction_status: transaction?.status ?? null,
    completed_at: formatTransactionDate(row.created_at)
  }
}

async function getUserCompletedStages ({
  userId,
  status,
  cursor = null,
  decodedCursor = null,
  limit
}) {
  const { rows, hasNext } =
    await employeeTaskRepository.getStagesCompletedByUser({
      userId,
      status,
      limit,
      cursor: decodedCursor
    })

  if (!rows.length) {
    return emptyCursorPaginatedResult({ limit, cursor })
  }

  const nextCursor =
    hasNext && rows.length ? buildUserStageCursor(rows[rows.length - 1]) : null

  return {
    items: rows.map(mapUserStageToItem),
    pagination: buildCursorPaginationMeta({
      limit,
      cursor,
      nextCursor,
      hasNext
    })
  }
}

function buildTerminalInstanceCursor (instance) {
  return encodeCursor({
    k: 'task',
    p: normalizeProcessPriority(instance.process_definition?.priority),
    t: new Date(instance.transaction.created_at).toISOString(),
    id: instance.id
  })
}

async function getDepartmentTerminalTasks ({
  userId,
  departmentIds,
  transactionStatus,
  fromDate = null,
  toDate = null,
  cursor = null,
  decodedCursor = null,
  limit
}) {
  const access = await employeeTaskRepository.userHasDepartmentsAccess(
    userId,
    departmentIds
  )

  if (!access.allowed) {
    const error = new Error(
      `لا تملك صلاحية الوصول للدوائر: ${access.deniedIds.join(', ')}`
    )
    error.code = 'FORBIDDEN'
    throw error
  }

  const { rows, hasNext } =
    await employeeTaskRepository.getTerminalInstancesByDepartments({
      departmentIds,
      transactionStatus,
      fromDate,
      toDate,
      limit,
      cursor: decodedCursor
    })

  if (!rows.length) {
    return emptyCursorPaginatedResult({ limit, cursor })
  }

  const { stageCountMap, completedStageCountMap } =
    await buildProgressMaps(rows)
  const stageNameMap = await buildStageNameMap(rows)

  const items = rows.map(instance =>
    mapInstanceToTask({
      instance,
      activeTask: null,
      userId,
      stageCountMap,
      completedStageCountMap,
      stageNameMap
    })
  )

  const nextCursor = hasNext
    ? buildTerminalInstanceCursor(rows[rows.length - 1])
    : null

  return {
    items,
    pagination: buildCursorPaginationMeta({
      limit,
      cursor,
      nextCursor,
      hasNext
    })
  }
}

function parseDepartmentIds ({ query = {} } = {}) {
  const rawParts = []
  const fromQuery = query.department_ids ?? query.department_id

  if (fromQuery != null && String(fromQuery).trim() !== '') {
    if (Array.isArray(fromQuery)) {
      rawParts.push(...fromQuery.map(value => String(value).trim()))
    } else {
      rawParts.push(...String(fromQuery).split(','))
    }
  }

  const departmentIds = [
    ...new Set(
      rawParts
        .map(part => String(part).trim())
        .filter(Boolean)
        .map(part => parseInt(part, 10))
        .filter(id => Number.isInteger(id) && id >= 1)
    )
  ]

  if (!departmentIds.length) {
    const error = new Error(
      'department_ids مطلوب — مثال: ?department_ids=1 أو ?department_ids=1,2,3'
    )
    error.code = 'VALIDATION_ERROR'
    throw error
  }

  return departmentIds
}

function parseBoundaryDate (value, { endOfDay = false } = {}) {
  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    const error = new Error(`تاريخ غير صالح: ${value}`)
    error.code = 'VALIDATION_ERROR'
    throw error
  }

  if (endOfDay) {
    parsed.setHours(23, 59, 59, 999)
  } else {
    parsed.setHours(0, 0, 0, 0)
  }

  return parsed
}

function parseDateRange ({ query = {} } = {}) {
  const fromRaw = query.from_date ?? query.date_from
  const toRaw = query.to_date ?? query.date_to

  if (
    (fromRaw == null || String(fromRaw).trim() === '') &&
    (toRaw == null || String(toRaw).trim() === '')
  ) {
    return { fromDate: null, toDate: null }
  }

  const fromDate = fromRaw != null && String(fromRaw).trim() !== ''
    ? parseBoundaryDate(fromRaw, { endOfDay: false })
    : null
  const toDate = toRaw != null && String(toRaw).trim() !== ''
    ? parseBoundaryDate(toRaw, { endOfDay: true })
    : null

  if (fromDate && toDate && fromDate > toDate) {
    const error = new Error('from_date يجب أن يكون قبل أو يساوي to_date')
    error.code = 'VALIDATION_ERROR'
    throw error
  }

  return { fromDate, toDate }
}

async function loadActiveEmployeeTasks ({
  userId,
  page,
  limit,
  offset,
  cursor,
  employeeStatusFilter
}) {
  const context = await loadEmployeeStageContext(userId)

  if (!context) {
    return page != null
      ? emptyPaginatedResult({ page, limit })
      : emptyCursorPaginatedResult({ limit, cursor })
  }

  return getRunningTasks({
    userId,
    stageIds: context.stageIds,
    processDefinitionIds: context.processDefinitionIds,
    page,
    limit,
    offset,
    cursor,
    decodedCursor: cursor ? decodeCursor(cursor) : null,
    employeeStatusFilter
  })
}

async function loadCachedEmployeeTasks ({
  userId,
  cursor,
  limit,
  cacheScope,
  loader
}) {
  const cacheKey = KEYS.employeeTasks(userId, cacheScope, cursor, limit)

  return getOrLoad(
    cacheKey,
    () => loader(),
    {
      label: `employee-tasks:${cacheScope}`,
      ttlSeconds: EMPLOYEE_TASKS_CACHE_TTL_SECONDS
    }
  )
}

async function loadCachedDepartmentTasks ({
  userId,
  departmentIds,
  transactionStatus,
  fromDate,
  toDate,
  cursor,
  limit
}) {
  const cacheKey = KEYS.employeeTasksByDepartments(
    userId,
    departmentIds,
    transactionStatus,
    cursor,
    limit,
    fromDate,
    toDate
  )

  const deptLabel = [...departmentIds].sort((a, b) => a - b).join(',')

  return getOrLoad(
    cacheKey,
    () =>
      getDepartmentTerminalTasks({
        userId,
        departmentIds,
        transactionStatus,
        fromDate,
        toDate,
        cursor,
        decodedCursor: cursor ? decodeCursor(cursor) : null,
        limit
      }),
    {
      label: `employee-tasks:depts:${deptLabel}:${transactionStatus}`,
      ttlSeconds: EMPLOYEE_TASKS_CACHE_TTL_SECONDS
    }
  )
}

async function getActiveEmployeeTasks ({
  userId,
  page,
  limit,
  offset,
  employeeStatusFilter = EMPLOYEE_STATUS_FILTERS.ALL_ACTIVE
}) {
  // Active lists (pending_pickup / in_progress) change on every submit, complete,
  // and lock — per-user Redis cache was not invalidated for other assignees, so
  // new tasks could stay hidden until TTL expired. Always load fresh from DB+Camunda.
  const data = await loadActiveEmployeeTasks({
    userId,
    page,
    limit,
    offset,
    employeeStatusFilter
  })

  return {
    message: 'تم جلب المهام بنجاح',
    data
  }
}

async function getCompletedByDepartment ({
  userId,
  departmentIds,
  fromDate,
  toDate,
  cursor,
  limit
}) {
  const data = await loadCachedDepartmentTasks({
    userId,
    departmentIds,
    transactionStatus: 'completed',
    fromDate,
    toDate,
    cursor,
    limit
  })

  return {
    message: 'تم جلب المعاملات المنجزة للدوائر بنجاح',
    data
  }
}

async function getRejectedByDepartment ({
  userId,
  departmentIds,
  fromDate,
  toDate,
  cursor,
  limit
}) {
  const data = await loadCachedDepartmentTasks({
    userId,
    departmentIds,
    transactionStatus: 'rejected',
    fromDate,
    toDate,
    cursor,
    limit
  })

  return {
    message: 'تم جلب المعاملات المرفوضة للدوائر بنجاح',
    data
  }
}

async function getAllTasks ({ userId, cursor, limit, status = 'active' }) {
  if (status === 'completed' || status === 'rejected') {
    const cacheScope = `terminal:${status}`

    const data = await loadCachedEmployeeTasks({
      userId,
      cursor,
      limit,
      cacheScope,
      loader: () =>
        getUserCompletedStages({
          userId,
          status,
          cursor,
          decodedCursor: cursor ? decodeCursor(cursor) : null,
          limit
        })
    })

    return {
      message: 'تم جلب المهام بنجاح',
      data
    }
  }

  const data = await loadActiveEmployeeTasks({
    userId,
    cursor,
    limit,
    employeeStatusFilter: EMPLOYEE_STATUS_FILTERS.ALL_ACTIVE
  })

  return {
    message: 'تم جلب المهام بنجاح',
    data
  }
}

module.exports = {
  EMPLOYEE_STATUS_FILTERS,
  parseDepartmentIds,
  parseDateRange,
  getAllTasks,
  getActiveEmployeeTasks,
  getCompletedByDepartment,
  getRejectedByDepartment
}
