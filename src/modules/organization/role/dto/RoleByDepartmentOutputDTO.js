'use strict'

class RoleByDepartmentOutputDTO {
  constructor ({
    id,
    organization_department_roles_id,
    name,
    code
  }) {
    this.id = id
    this.organization_department_roles_id = organization_department_roles_id
    this.name = name
    this.code = code
  }
}

module.exports = {
  RoleByDepartmentOutputDTO
}
