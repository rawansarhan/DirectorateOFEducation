'use strict'

class RoleUpdateInputDTO {
  constructor (data = {}) {
    if (data.organization_id !== undefined) this.organization_id = data.organization_id
    if (data.department_id !== undefined) this.department_id = data.department_id
    if (data.parent_id !== undefined) this.parent_id = data.parent_id
  }
}

module.exports = {
  RoleUpdateInputDTO
}
