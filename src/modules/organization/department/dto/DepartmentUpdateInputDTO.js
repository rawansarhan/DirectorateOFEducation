'use strict'

class DepartmentUpdateInputDTO {
  constructor (data = {}) {
    if (data.name !== undefined) this.name = data.name
    if (data.organization_id !== undefined) this.organization_id = data.organization_id
    if (data.parent_id !== undefined) this.parent_id = data.parent_id
  }
}

module.exports = {
  DepartmentUpdateInputDTO
}
