'use strict'

class OrganizationUpdateInputDTO {
  constructor (data = {}) {
    if (data.name !== undefined) this.name = data.name
    if (data.parent_id !== undefined) this.parent_id = data.parent_id
    if (data.location_id !== undefined) this.location_id = data.location_id
  }
}

module.exports = {
  OrganizationUpdateInputDTO
}
