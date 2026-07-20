'use strict'

/**
 * =============================================================================
 * getAllTasksService — واجهة عامة لقوائم مهام الموظف
 * =============================================================================
 *
 * المنطق التفصيلي تحت:
 *   services/employeeTasks/
 */

const {
  EMPLOYEE_STATUS_FILTERS,
  TASK_LIST_STATUS,
  normalizeTaskListStatus
} = require('./employeeTasks/employeeTaskConstants')
const {
  parseDepartmentIds,
  parseDateRange
} = require('./employeeTasks/employeeTaskQueryParsers')
const {
  getAllTasks
} = require('./employeeTasks/employeeMergedTasksService')
const {
  getActiveEmployeeTasks
} = require('./employeeTasks/employeeActiveTasksService')
const {
  getCompletedByDepartment,
  getRejectedByDepartment
} = require('./employeeTasks/employeeDepartmentTasksService')

module.exports = {
  EMPLOYEE_STATUS_FILTERS,
  TASK_LIST_STATUS,
  normalizeTaskListStatus,
  parseDepartmentIds,
  parseDateRange,
  getAllTasks,
  getActiveEmployeeTasks,
  getCompletedByDepartment,
  getRejectedByDepartment
}
