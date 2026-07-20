'use strict'

const {
  buildCursorPaginationMeta,
  encodeCursor,
  decodeCursor
} = require('../../../../../core/utils/pagination')
const {
  EMPLOYEE_STATUS_FILTERS,
  TASK_LIST_STATUS,
  normalizeTaskListStatus
} = require('./employeeTaskConstants')
const { mergeTaskItemsByActivity } = require('./employeeTaskMappers')
const { loadActiveEmployeeTasks } = require('./employeeActiveTasksService')
const {
  getUserCompletedStages,
  loadTerminalEmployeeTasks
} = require('./employeeTerminalTasksService')

async function getMergedAllEmployeeTasks ({ userId, cursor, limit }) {
  const decoded = cursor ? decodeCursor(cursor) : null
  const offset = decoded?.k === 'all' ? Number(decoded.o) || 0 : 0
  const fetchSize = offset + limit + 1

  const [activeData, completedData, rejectedData] = await Promise.all([
    loadActiveEmployeeTasks({
      userId,
      page: 1,
      limit: fetchSize,
      offset: 0,
      employeeStatusFilter: EMPLOYEE_STATUS_FILTERS.ALL_ACTIVE
    }),
    getUserCompletedStages({
      userId,
      status: 'completed',
      limit: fetchSize
    }),
    getUserCompletedStages({
      userId,
      status: 'rejected',
      limit: fetchSize
    })
  ])

  const merged = mergeTaskItemsByActivity({
    activeItems: activeData.items || [],
    completedItems: completedData.items || [],
    rejectedItems: rejectedData.items || []
  })

  const slice = merged.slice(offset, offset + limit + 1)
  const hasNext = slice.length > limit
  const pageEntries = hasNext ? slice.slice(0, limit) : slice
  const nextOffset = offset + pageEntries.length
  const nextCursor = hasNext
    ? encodeCursor({ k: 'all', o: nextOffset })
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

async function getAllTasks ({
  userId,
  cursor,
  limit,
  status = TASK_LIST_STATUS.ALL
}) {
  const normalizedStatus = normalizeTaskListStatus(status)

  if (normalizedStatus === TASK_LIST_STATUS.COMPLETED ||
    normalizedStatus === TASK_LIST_STATUS.REJECTED) {
    const data = await loadTerminalEmployeeTasks({
      userId,
      cursor,
      limit,
      status: normalizedStatus
    })

    return {
      message: 'تم جلب المهام بنجاح',
      data
    }
  }

  if (normalizedStatus === TASK_LIST_STATUS.PENDING_PICKUP ||
    normalizedStatus === TASK_LIST_STATUS.IN_PROGRESS) {
    const data = await loadActiveEmployeeTasks({
      userId,
      cursor,
      limit,
      employeeStatusFilter: normalizedStatus
    })

    return {
      message: 'تم جلب المهام بنجاح',
      data
    }
  }

  if (normalizedStatus === TASK_LIST_STATUS.ACTIVE) {
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

  const data = await getMergedAllEmployeeTasks({ userId, cursor, limit })

  return {
    message: 'تم جلب المهام بنجاح',
    data
  }
}

module.exports = {
  getMergedAllEmployeeTasks,
  getAllTasks
}
