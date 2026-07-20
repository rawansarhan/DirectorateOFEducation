'use strict'

function toPlain (row) {
  if (!row) return null
  return typeof row.get === 'function' ? row.get({ plain: true }) : row
}

class EmployeeOutputDTO {
  constructor (row) {
    const plain = toPlain(row) || {}
    const assignment = (plain.role_assignments || [])[0] || null
    const odr = assignment ? assignment.org_department_role : null

    this.id = plain.id
    this.userName = plain.userName
    this.email = plain.email
    this.phone_number = plain.phone_number
    this.first_name = plain.first_name
    this.last_name = plain.last_name
    this.father_name = plain.father_name
    this.mother_name = plain.mother_name
    this.national_id = plain.national_id
    this.is_active = plain.is_active
    this.organization = odr && odr.organization
      ? { id: odr.organization.id, name: odr.organization.name }
      : null
    this.department = odr && odr.department
      ? { id: odr.department.id, name: odr.department.name }
      : null
    this.role = odr && odr.role
      ? { id: odr.role.id, name: odr.role.name, code: odr.role.code }
      : null
    this.organization_department_roles_id = odr ? odr.id : null
    this.created_at = plain.created_at
    this.updated_at = plain.updated_at
  }
}

module.exports = {
  EmployeeOutputDTO
}
