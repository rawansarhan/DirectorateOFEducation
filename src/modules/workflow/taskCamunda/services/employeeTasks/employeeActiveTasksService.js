'use strict'

const employeeTaskRepository = require('../../repositories/employeeTaskRepository')
const {
  emptyPaginatedResult,
  emptyCursorPaginatedResult,
  buildPaginationMeta,
  buildCursorPaginationMeta,
  decodeCursor
} = require('../../../../../core/utils/pagination')
const {
  releaseExpiredTaskLocksForProcessInstances
} = require('../taskLockService')
const {
  normalizeProcessPriority
} = require('../../utils/employeeTaskFormatters')
const {
  EMPLOYEE_STATUS_FILTERS,
  matchesEmployeeStatusFilter
} = require('./employeeTaskConstants')
const {
  taskItemMatchesSearch
} = require('../../utils/taskSearchFilters')
const {
  mapInstanceToTask,
  buildProgressMaps,
  buildStageNameMap,
  isActivePairAfterCursor,
  buildActiveTaskCursor
} = require('./employeeTaskMappers')
const {
  fetchActiveCamundaTasks,
  matchInstancesToUserStages,
  loadEmployeeStageContext
} = require('./employeeTaskMatching')

async function getRunningTasks ({
  userId,
  stageIds,
  roleIds = [],
  processDefinitionIds,
  limit,
  employeeStatusFilter = EMPLOYEE_STATUS_FILTERS.ALL_ACTIVE,
  cursor = null,
  decodedCursor = null,
  page = null,
  offset = null,
  searchFilters = null
}) {
  const instanceMap = new Map()

  if (processDefinitionIds?.length) {
    const byProcess =
      await employeeTaskRepository.getRunningInstancesForProcessDefinitions({
        processDefinitionIds
      })

    for (const instance of byProcess) {
      instanceMap.set(instance.id, instance)
    }
  }

  if (roleIds.length) {
    const byRoute =
      await employeeTaskRepository.getRunningInstancesForAssigneeRoute(roleIds)

    for (const instance of byRoute) {
      instanceMap.set(instance.id, instance)
    }
  }

  const instances = [...instanceMap.values()]

  if (!instances.length) {
    return page != null
      ? emptyPaginatedResult({ page, limit })
      : emptyCursorPaginatedResult({ limit, cursor })
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
    roleIds,
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

    if (dateA - dateB !== 0) {
      return dateA - dateB
    }

    if (a.instance.id !== b.instance.id) {
      return a.instance.id - b.instance.id
    }

    return String(a.activeTask?.id || '').localeCompare(
      String(b.activeTask?.id || '')
    )
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
      activeStage: pair.activeStage,
      userId,
      stageCountMap,
      completedStageCountMap,
      stageNameMap
    })
  }))

  const filteredPairs = enrichedPairs.filter(({ item }) =>
    matchesEmployeeStatusFilter(item, employeeStatusFilter)
  ).filter(({ item }) =>
    !searchFilters || taskItemMatchesSearch(item, searchFilters)
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

async function loadActiveEmployeeTasks ({
  userId,
  page,
  limit,
  offset,
  cursor,
  employeeStatusFilter,
  searchFilters = null
}) {
  const context = await loadEmployeeStageContext(userId)

  if (!context || (!context.stageIds.length && !context.roleIds.length)) {
    return page != null
      ? emptyPaginatedResult({ page, limit })
      : emptyCursorPaginatedResult({ limit, cursor })
  }

  return getRunningTasks({
    userId,
    stageIds: context.stageIds,
    roleIds: context.roleIds,
    processDefinitionIds: context.processDefinitionIds,
    page,
    limit,
    offset,
    cursor,
    decodedCursor: cursor ? decodeCursor(cursor) : null,
    employeeStatusFilter,
    searchFilters
  })
}

async function getActiveEmployeeTasks ({
  userId,
  page,
  limit,
  offset,
  employeeStatusFilter = EMPLOYEE_STATUS_FILTERS.ALL_ACTIVE
}) {
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

module.exports = {
  getRunningTasks,
  loadActiveEmployeeTasks,
  getActiveEmployeeTasks
}
