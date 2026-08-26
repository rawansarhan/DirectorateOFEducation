'use strict'

const { resolveWorkloadStatus } = require('../utils/workloadStatus')

function toPlain (row) {
  if (!row) return null
  return typeof row.get === 'function' ? row.get({ plain: true }) : row
}

class DepartmentEmployeeOutputDTO {
  constructor ({ assignment, completedCount = 0, workload = {} }) {
    const plain = toPlain(assignment) || {}
    const user = toPlain(plain.user) || {}
    const odr = toPlain(plain.org_department_role) || {}
    const workloadStatus = resolveWorkloadStatus(workload.workload_percent)

    this.assignment_id = plain.id
    this.employee_id = user.id
    this.first_name = user.first_name
    this.last_name = user.last_name
    this.father_name = user.father_name
    this.mother_name = user.mother_name
    this.national_id = user.national_id
    this.organization_department_roles_id =
      plain.organization_department_roles_id ?? odr.id ?? null
    this.department = odr.department
      ? { id: odr.department.id, name: odr.department.name }
      : null
    this.role = odr.role
      ? { id: odr.role.id, name: odr.role.name, code: odr.role.code }
      : null
    this.tasks = {
      in_progress: workload.in_progress,
      pending_pickup: workload.pending_pickup,
      active_total: workload.active_total,
      completed: completedCount
    }
    this.workload_percent = workload.workload_percent
    this.status = workloadStatus.status
    this.status_label = workloadStatus.status_label
  }
}

module.exports = {
  DepartmentEmployeeOutputDTO
}
