'use strict'

const {
  validateDepartmentTransactionSearchQuery
} = require('../validations/transactionSearchValidation')
const {
  parseCursorPaginationQuery
} = require('../../../../core/utils/pagination')
const { parseDateRange } = require('../../../workflow/taskCamunda/services/employeeTasks/employeeTaskQueryParsers')
const {
  getCompletedByDepartment,
  getRejectedByDepartment
} = require('../../../workflow/taskCamunda/services/employeeTasks/employeeDepartmentTasksService')
const { createTransactionError } = require('../utils/transactionErrors')
const { hasAnySearchFilter } = require('../../../workflow/taskCamunda/utils/taskSearchFilters')

function toDateRange (filters) {
  return parseDateRange({
    query: {
      from_date: filters.from_date || undefined,
      to_date: filters.to_date || undefined
    }
  })
}
//هذه الدالة للبحث عن المعاملات حسب الحالة المحدد 
async function searchDepartmentTransactions ({
  userId,
  query = {},
  transactionStatus
}) {
  const { error, value } = validateDepartmentTransactionSearchQuery(query)

  if (error) {
    throw createTransactionError('VALIDATION_ERROR', error)
  }

  let limit
  let cursor

  try {
    ;({ limit, cursor } = parseCursorPaginationQuery(query, {
      defaultLimit: 20
    }))
  } catch (err) {
    throw createTransactionError('VALIDATION_ERROR', err.message)
  }

  const { fromDate, toDate } = toDateRange(value)
  const searchFilters = hasAnySearchFilter(value.searchFilters)
    ? value.searchFilters
    : null

  const loader =
    transactionStatus === 'rejected'
      ? getRejectedByDepartment
      : getCompletedByDepartment

  try {
    return await loader({
      userId,
      departmentIds: value.department_ids,
      fromDate,
      toDate,
      cursor,
      limit,
      searchFilters
    })
  } catch (err) {
    if (err.code === 'FORBIDDEN') {
      const e = createTransactionError('FORBIDDEN', err.message)
      e.statusCode = 403
      throw e
    }
    throw err
  }
}

async function searchCompletedTransactions (userId, query = {}) {
  return searchDepartmentTransactions({
    userId,
    query,
    transactionStatus: 'completed'
  })
}

async function searchRejectedTransactions (userId, query = {}) {
  return searchDepartmentTransactions({
    userId,
    query,
    transactionStatus: 'rejected'
  })
}

module.exports = {
  searchCompletedTransactions,
  searchRejectedTransactions
}
