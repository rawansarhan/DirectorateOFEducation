'use strict'

const employeeTaskRepository = require('../repositories/employeeTaskRepository')
const processInstanceRepository = require('../repositories/processInstanceRepository')
const stageRepository = require('../../processDefinition/repositories/stageRepository')
const camundaClient = require('../../../../core/shared/clients/camunda/camundaClient')
const { toEmployeeTaskItem } = require('../mappers/taskCamundaMapper')
const {
  emptyPaginatedResult,
  buildPaginationMeta
} = require('../../../../core/utils/pagination')
const { retryWithBackoff } = require('../../../../core/utils/retryWithBackoff')
const {
  KEYS,
  getOrLoad,
  getCachedJson,
  setCachedJson,
  buildFullCacheKey,
  logCacheHit,
  logCacheMiss,
  invalidateEmployeeActiveTaskList
} = require('../../../../core/cache/apiCacheService')
const { EMPLOYEE_TASKS_CACHE_TTL_SECONDS } = require('../../../../core/config/env')
const {
  resolveEmployeeTaskStatus,
  calculateProgressPercent
} = require('../utils/employeeTaskStatus')
const {
  releaseExpiredTaskLocksForProcessInstances
} = require('./taskLockService')
const {
  normalizeProcessPriority
} = require('../utils/employeeTaskFormatters')

const EMPLOYEE_STATUS_FILTERS = {
  ALL_ACTIVE: 'all_active',
  IN_PROGRESS: 'in_progress',
  PENDING_PICKUP: 'pending_pickup'
}

const activeTaskListMemoryCache = new Map()

function parseActiveTasksRefresh (query = {}) {
  const raw = query.refresh

  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return false
  }

  const normalized = String(raw).trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes'
}

function activeTaskListMemoryKey (userId, filterScope) {
  return `${userId}:${filterScope}`
}

function activeTaskCacheLabel (userId, filterScope) {
  return `active-tasks:${filterScope}:user${userId}`
}

async function readCachedActiveTaskList (userId, filterScope) {
  const cacheKey = KEYS.employeeActiveTaskList(userId, filterScope)
  const fullKey = buildFullCacheKey(cacheKey)
  const label = activeTaskCacheLabel(userId, filterScope)
  const cached = await getCachedJson(fullKey)

  if (Array.isArray(cached?.items)) {
    logCacheHit({
      label,
      fullKey,
      itemCount: cached.items.length,
      source: 'REDIS'
    })

    return cached.items
  }

  const memoryEntry = activeTaskListMemoryCache.get(
    activeTaskListMemoryKey(userId, filterScope)
  )

  if (memoryEntry?.expiresAt > Date.now() && Array.isArray(memoryEntry.items)) {
    logCacheHit({
      label,
      fullKey,
      itemCount: memoryEntry.items.length,
      source: 'MEMORY'
    })

    return memoryEntry.items
  }

  if (memoryEntry) {
    activeTaskListMemoryCache.delete(activeTaskListMemoryKey(userId, filterScope))
  }

  return null
}

async function writeCachedActiveTaskList (userId, filterScope, items) {
  const cacheKey = KEYS.employeeActiveTaskList(userId, filterScope)
  const fullKey = buildFullCacheKey(cacheKey)
  const ttlSeconds = EMPLOYEE_TASKS_CACHE_TTL_SECONDS
  const savedToRedis = await setCachedJson(fullKey, { items }, ttlSeconds)

  activeTaskListMemoryCache.set(activeTaskListMemoryKey(userId, filterScope), {
    items,
    expiresAt: Date.now() + ttlSeconds * 1000
  })

  console.log(
    `[ActiveTaskCache] SAVED — scope: ${filterScope} — user: ${userId} — items: ${items.length} — redis: ${savedToRedis ? 'yes' : 'memory-only'} — TTL: ${ttlSeconds}s — key: ${fullKey}`
  )

  return savedToRedis
}

async function clearCachedActiveTaskList (userId, filterScope) {
  const cacheKey = KEYS.employeeActiveTaskList(userId, filterScope)
  const fullKey = buildFullCacheKey(cacheKey)

  console.log(
    `[ActiveTaskCache] REFRESH — clearing cache — scope: ${filterScope} — user: ${userId} — key: ${fullKey}`
  )

  await invalidateEmployeeActiveTaskList(userId, filterScope)
  activeTaskListMemoryCache.delete(activeTaskListMemoryKey(userId, filterScope))
}

function logActiveTaskPageSlice ({
  userId,
  filterScope,
  page,
  limit,
  returnedCount,
  totalCount,
  fromCache
}) {
  console.log(
    `[ActiveTaskCache] PAGE — scope: ${filterScope} — user: ${userId} — page: ${page} — limit: ${limit} — returned: ${returnedCount}/${totalCount} — source: ${fromCache ? 'CACHE_SLICE' : 'FRESH_BUILD'}`
  )
}

function paginateTaskListItems (items, { page, limit, offset }) {
  const pageItems = items.slice(offset, offset + limit)

  return {
    items: pageItems,
    pagination: buildPaginationMeta({
      page,
      limit,
      total: items.length
    })
  }
}

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

async function buildActiveTaskListSnapshot ({
  userId,
  stageIds,
  processDefinitionIds,
  employeeStatusFilter = EMPLOYEE_STATUS_FILTERS.ALL_ACTIVE
}) {
  const instances =
    await employeeTaskRepository.getRunningInstancesForProcessDefinitions({
      processDefinitionIds
    })

  if (!instances.length) {
    return []
  }

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
    return []
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

  const allItems = sortedPairs.map(({ instance, activeTask, activeStage }) =>
    mapInstanceToTask({
      instance,
      activeTask,
      userId,
      stageCountMap,
      completedStageCountMap,
      stageNameOverride: activeTask?.name || activeStage?.name || null
    })
  )

  return allItems.filter(item =>
    matchesEmployeeStatusFilter(item, employeeStatusFilter)
  )
}

async function getTerminalTasks ({
  userId,
  processDefinitionIds,
  transactionStatus,
  page,
  limit,
  offset
}) {
  const { rows, count } =
    await employeeTaskRepository.getTerminalInstancesForStages({
      processDefinitionIds,
      transactionStatus,
      limit,
      offset
    })

  if (!rows.length) {
    return emptyPaginatedResult({ page, limit })
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

  return {
    items,
    pagination: buildPaginationMeta({ page, limit, total: count })
  }
}

async function getDepartmentTerminalTasks ({
  userId,
  departmentIds,
  transactionStatus,
  fromDate = null,
  toDate = null,
  page,
  limit,
  offset
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

  const { rows, count } =
    await employeeTaskRepository.getTerminalInstancesByDepartments({
      departmentIds,
      transactionStatus,
      fromDate,
      toDate,
      limit,
      offset
    })

  if (!rows.length) {
    return emptyPaginatedResult({ page, limit })
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

  return {
    items,
    pagination: buildPaginationMeta({ page, limit, total: count })
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
  employeeStatusFilter,
  refresh = false
}) {
  const context = await loadEmployeeStageContext(userId)

  if (!context) {
    return emptyPaginatedResult({ page, limit })
  }

  const filterScope = employeeStatusFilter || EMPLOYEE_STATUS_FILTERS.ALL_ACTIVE

  if (refresh) {
    await clearCachedActiveTaskList(userId, filterScope)
  }

  let cachedItems = refresh
    ? null
    : await readCachedActiveTaskList(userId, filterScope)
  let loadedFromCache = Boolean(cachedItems)

  if (!cachedItems) {
    const label = activeTaskCacheLabel(userId, filterScope)
    const fullKey = buildFullCacheKey(
      KEYS.employeeActiveTaskList(userId, filterScope)
    )
    const startedAt = Date.now()

    cachedItems = await buildActiveTaskListSnapshot({
      userId,
      stageIds: context.stageIds,
      processDefinitionIds: context.processDefinitionIds,
      employeeStatusFilter: filterScope
    })

    const savedToRedis = await writeCachedActiveTaskList(
      userId,
      filterScope,
      cachedItems
    )

    logCacheMiss({
      label,
      fullKey,
      durationMs: Date.now() - startedAt,
      cached: savedToRedis,
      itemCount: cachedItems.length,
      ttlSeconds: EMPLOYEE_TASKS_CACHE_TTL_SECONDS
    })

    loadedFromCache = false
  }

  if (!cachedItems.length) {
    return emptyPaginatedResult({ page, limit })
  }

  const result = paginateTaskListItems(cachedItems, { page, limit, offset })

  logActiveTaskPageSlice({
    userId,
    filterScope,
    page,
    limit,
    returnedCount: result.items.length,
    totalCount: cachedItems.length,
    fromCache: loadedFromCache
  })

  return result
}

async function loadCachedEmployeeTasks ({
  userId,
  page,
  limit,
  offset,
  cacheScope,
  loader
}) {
  const cacheKey = KEYS.employeeTasks(userId, cacheScope, page, limit)

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
  page,
  limit,
  offset
}) {
  const cacheKey = KEYS.employeeTasksByDepartments(
    userId,
    departmentIds,
    transactionStatus,
    page,
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
        page,
        limit,
        offset
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
  employeeStatusFilter = EMPLOYEE_STATUS_FILTERS.ALL_ACTIVE,
  refresh = false
}) {
  const data = await loadActiveEmployeeTasks({
    userId,
    page,
    limit,
    offset,
    employeeStatusFilter,
    refresh
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
  page,
  limit,
  offset
}) {
  const data = await loadCachedDepartmentTasks({
    userId,
    departmentIds,
    transactionStatus: 'completed',
    fromDate,
    toDate,
    page,
    limit,
    offset
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
  page,
  limit,
  offset
}) {
  const data = await loadCachedDepartmentTasks({
    userId,
    departmentIds,
    transactionStatus: 'rejected',
    fromDate,
    toDate,
    page,
    limit,
    offset
  })

  return {
    message: 'تم جلب المعاملات المرفوضة للدوائر بنجاح',
    data
  }
}

async function getAllTasks ({
  userId,
  page,
  limit,
  offset,
  status = 'active',
  refresh = false
}) {
  const paginationInput = { page, limit, offset }

  if (status === 'completed' || status === 'rejected') {
    const context = await loadEmployeeStageContext(userId)

    if (!context) {
      return {
        message: 'لا توجد مهام',
        data: emptyPaginatedResult(paginationInput)
      }
    }

    const cacheScope = `terminal:${status}`

    const data = await loadCachedEmployeeTasks({
      userId,
      page,
      limit,
      offset,
      cacheScope,
      loader: () =>
        getTerminalTasks({
          userId,
          processDefinitionIds: context.processDefinitionIds,
          transactionStatus: status,
          page,
          limit,
          offset
        })
    })

    return {
      message: 'تم جلب المهام بنجاح',
      data
    }
  }

  return getActiveEmployeeTasks({
    userId,
    page,
    limit,
    offset,
    employeeStatusFilter: EMPLOYEE_STATUS_FILTERS.ALL_ACTIVE,
    refresh
  })
}

module.exports = {
  EMPLOYEE_STATUS_FILTERS,
  parseDepartmentIds,
  parseDateRange,
  parseActiveTasksRefresh,
  getAllTasks,
  getActiveEmployeeTasks,
  getCompletedByDepartment,
  getRejectedByDepartment
}
