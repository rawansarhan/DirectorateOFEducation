'use strict'

class RoleInputDTO {
  constructor ({
    name,
    code,
    organization_id,
    department_id,
    parent_id = null
  }) {
    this.name = name
    this.code = code
    this.organization_id = organization_id
    this.department_id = department_id
    this.parent_id = parent_id ?? null
  }
}

module.exports = {
  RoleInputDTO
}
