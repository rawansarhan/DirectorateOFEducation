'use strict'

class DepartmentInputDTO {
  constructor ({
    name,
    organization_id,
    parent_id = null
  }) {
    this.name = name
    this.organization_id = organization_id
    this.parent_id = parent_id ?? null
  }
}

module.exports = {
  DepartmentInputDTO
}
