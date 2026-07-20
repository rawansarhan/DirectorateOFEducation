'use strict'

const employeeTaskRepository = require('../../repositories/employeeTaskRepository')
const {
  emptyCursorPaginatedResult,
  buildCursorPaginationMeta,
  decodeCursor
} = require('../../../../../core/utils/pagination')
const {
  KEYS,
  getOrLoad
} = require('../../../../../core/cache/apiCacheService')
const { EMPLOYEE_TASKS_CACHE_TTL_SECONDS } = require('../../../../../core/config/env')
const {
  mapInstanceToTask,
  buildProgressMaps,
  buildStageNameMap,
  buildTerminalInstanceCursor
} = require('./employeeTaskMappers')

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

module.exports = {
  getDepartmentTerminalTasks,
  loadCachedDepartmentTasks,
  getCompletedByDepartment,
  getRejectedByDepartment
}
