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
  mapUserStageToItem,
  buildUserStageCursor
} = require('./employeeTaskMappers')

async function getUserCompletedStages ({
  userId,
  status,
  cursor = null,
  decodedCursor = null,
  limit,
  searchFilters = null
}) {
  const { rows, hasNext } =
    await employeeTaskRepository.getStagesCompletedByUser({
      userId,
      status,
      limit,
      cursor: decodedCursor,
      searchFilters
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

async function loadTerminalEmployeeTasks ({
  userId,
  cursor,
  limit,
  status,
  useCache = true,
  searchFilters = null
}) {
  const loader = () =>
    getUserCompletedStages({
      userId,
      status,
      cursor,
      decodedCursor: cursor ? decodeCursor(cursor) : null,
      limit,
      searchFilters
    })

  if (!useCache || searchFilters) {
    return loader()
  }

  return loadCachedEmployeeTasks({
    userId,
    cursor,
    limit,
    cacheScope: `terminal:${status}`,
    loader
  })
}

module.exports = {
  getUserCompletedStages,
  loadCachedEmployeeTasks,
  loadTerminalEmployeeTasks
}
