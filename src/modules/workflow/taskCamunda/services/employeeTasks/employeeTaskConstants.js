'use strict'

const EMPLOYEE_STATUS_FILTERS = {
  ALL_ACTIVE: 'all_active',
  IN_PROGRESS: 'in_progress',
  PENDING_PICKUP: 'pending_pickup'
}

const TASK_LIST_STATUS = {
  ALL: 'all',
  PENDING_PICKUP: 'pending_pickup',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
  ACTIVE: 'active'
}

function normalizeTaskListStatus (status) {
  const value = String(status || TASK_LIST_STATUS.ALL).trim().toLowerCase()
  const allowed = new Set(Object.values(TASK_LIST_STATUS))

  if (!allowed.has(value)) {
    const error = new Error(
      'status غير صالح — المسموح: all, pending_pickup, in_progress, completed, rejected, active'
    )
    error.code = 'VALIDATION_ERROR'
    throw error
  }

  return value
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

module.exports = {
  EMPLOYEE_STATUS_FILTERS,
  TASK_LIST_STATUS,
  normalizeTaskListStatus,
  matchesEmployeeStatusFilter
}
