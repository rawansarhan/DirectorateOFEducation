'use strict'

const Joi = require('joi')
const {
  TASK_LIST_STATUS,
  normalizeTaskListStatus,
  EMPLOYEE_STATUS_FILTERS
} = require('./employeeTaskConstants')
const {
  getAllTasks
} = require('./employeeMergedTasksService')
const {
  loadActiveEmployeeTasks
} = require('./employeeActiveTasksService')
const {
  loadTerminalEmployeeTasks,
  getUserCompletedStages
} = require('./employeeTerminalTasksService')
const { hasAnySearchFilter } = require('../../utils/taskSearchFilters')
const { createHttpError, HTTP_STATUS } = require('../../../../../core/middleware/httpStatusCodes')
const {
  parseCursorPaginationQuery,
  encodeCursor,
  buildCursorPaginationMeta,
  decodeCursor
} = require('../../../../../core/utils/pagination')
const { mergeTaskItemsByActivity } = require('./employeeTaskMappers')

const searchSchema = Joi.object({
  cursor: Joi.string().trim().max(500).allow('', null).optional(),
  limit: Joi.number().integer().min(1).max(70).optional(),
  status: Joi.string()
    .valid('all', 'pending_pickup', 'in_progress', 'completed', 'rejected', 'active')
    .default('all')
    .optional(),

  q: Joi.string().trim().max(120).allow('', null).optional(),
  search: Joi.string().trim().max(120).allow('', null).optional(),
  first_name: Joi.string().trim().max(100).allow('', null).optional(),
  last_name: Joi.string().trim().max(100).allow('', null).optional(),
  father_name: Joi.string().trim().max(100).allow('', null).optional(),
  mother_name: Joi.string().trim().max(100).allow('', null).optional(),
  national_id: Joi.string().trim().max(50).allow('', null).optional(),
  id_process: Joi.string().trim().max(32).allow('', null).optional(),
  process_name: Joi.string().trim().max(255).allow('', null).optional()
}).unknown(false)

function parseSearchFilters (value) {
  const q = value.q || value.search || null
  const filters = {
    q: q ? String(q).trim() : null,
    first_name: value.first_name || null,
    last_name: value.last_name || null,
    father_name: value.father_name || null,
    mother_name: value.mother_name || null,
    national_id: value.national_id || null,
    id_process: value.id_process || null,
    process_name: value.process_name || null
  }

  return hasAnySearchFilter(filters) ? filters : null
}

async function searchMergedEmployeeTasks ({ userId, cursor, limit, searchFilters }) {
  const decoded = cursor ? decodeCursor(cursor) : null
  const offset = decoded?.k === 'all' ? Number(decoded.o) || 0 : 0
  const fetchSize = offset + limit + 1

  const [activeData, completedData, rejectedData] = await Promise.all([
    loadActiveEmployeeTasks({
      userId,
      page: 1,
      limit: fetchSize,
      offset: 0,
      employeeStatusFilter: EMPLOYEE_STATUS_FILTERS.ALL_ACTIVE,
      searchFilters
    }),
    getUserCompletedStages({
      userId,
      status: 'completed',
      limit: fetchSize,
      searchFilters
    }),
    getUserCompletedStages({
      userId,
      status: 'rejected',
      limit: fetchSize,
      searchFilters
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

async function searchEmployeeTasks ({ userId, query = {} }) {
  const { error, value } = searchSchema.validate(query, {
    abortEarly: false,
    stripUnknown: true,
    convert: true
  })

  if (error) {
    throw createHttpError(
      error.details.map(d => d.message).join(' | '),
      HTTP_STATUS.BAD_REQUEST,
      'VALIDATION_ERROR'
    )
  }

  const { limit, cursor } = parseCursorPaginationQuery(query, {
    defaultLimit: 20
  })

  const status = normalizeTaskListStatus(value.status || 'all')
  const searchFilters = parseSearchFilters(value)

  if (status === TASK_LIST_STATUS.COMPLETED || status === TASK_LIST_STATUS.REJECTED) {
    const data = await loadTerminalEmployeeTasks({
      userId,
      cursor,
      limit,
      status,
      searchFilters
    })

    return {
      message: 'تم جلب نتائج بحث مهام الموظف بنجاح',
      data
    }
  }

  if (
    status === TASK_LIST_STATUS.PENDING_PICKUP ||
    status === TASK_LIST_STATUS.IN_PROGRESS ||
    status === TASK_LIST_STATUS.ACTIVE
  ) {
    const employeeStatusFilter =
      status === TASK_LIST_STATUS.ACTIVE
        ? EMPLOYEE_STATUS_FILTERS.ALL_ACTIVE
        : status

    const data = await loadActiveEmployeeTasks({
      userId,
      cursor,
      limit,
      employeeStatusFilter,
      searchFilters
    })

    return {
      message: 'تم جلب نتائج بحث مهام الموظف بنجاح',
      data
    }
  }

  // status=all
  if (!searchFilters) {
    const result = await getAllTasks({ userId, cursor, limit, status: 'all' })
    return {
      message: 'تم جلب نتائج بحث مهام الموظف بنجاح',
      data: result.data
    }
  }

  const data = await searchMergedEmployeeTasks({
    userId,
    cursor,
    limit,
    searchFilters
  })

  return {
    message: 'تم جلب نتائج بحث مهام الموظف بنجاح',
    data
  }
}

module.exports = {
  searchEmployeeTasks
}
