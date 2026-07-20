'use strict'

function toPlain (row) {
  if (!row) return null
  return typeof row.get === 'function' ? row.get({ plain: true }) : row
}

class AccessibleDepartmentOutputDTO {
  constructor (row) {
    const plain = toPlain(row) || {}

    this.id = plain.id
    this.name = plain.name
    this.organization_id = plain.organization_id
    this.parent_id = plain.parent_id ?? null
    this.is_active = plain.is_active
  }
}

class AccessibleDepartmentsScopeOutputDTO {
  constructor ({
    root_org_dept_role_ids = [],
    org_dept_role_ids = [],
    department_ids = [],
    departments = []
  }) {
    this.root_org_dept_role_ids = root_org_dept_role_ids
    this.org_dept_role_ids = org_dept_role_ids
    this.department_ids = department_ids
    this.departments = departments.map(
      dept => new AccessibleDepartmentOutputDTO(dept)
    )
  }
}

module.exports = {
  AccessibleDepartmentOutputDTO,
  AccessibleDepartmentsScopeOutputDTO
}
