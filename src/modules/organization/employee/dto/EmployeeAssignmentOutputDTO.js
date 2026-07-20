'use strict'

function toPlain (row) {
  if (!row) return null
  return typeof row.get === 'function' ? row.get({ plain: true }) : row
}

class EmployeeAssignmentOutputDTO {
  constructor (assignment) {
    const plain = toPlain(assignment) || {}
    const user = plain.user || null

    this.assignment_id = plain.id
    this.organization_department_roles_id = plain.organization_department_roles_id
    this.priority = plain.priority
    this.is_active = plain.is_active
    this.user = user
      ? {
          id: user.id,
          userName: user.userName,
          email: user.email,
          phone_number: user.phone_number,
          first_name: user.first_name,
          last_name: user.last_name,
          father_name: user.father_name,
          mother_name: user.mother_name,
          national_id: user.national_id,
          is_active: user.is_active,
          created_at: user.created_at,
          updated_at: user.updated_at
        }
      : null
    this.created_at = plain.created_at
    this.updated_at = plain.updated_at
  }
}

module.exports = {
  EmployeeAssignmentOutputDTO
}
