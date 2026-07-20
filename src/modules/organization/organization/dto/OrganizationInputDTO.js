'use strict'

class OrganizationInputDTO {
  constructor ({
    name,
    parent_id = null,
    location_id = null
  }) {
    this.name = name
    this.parent_id = parent_id ?? null
    this.location_id = location_id ?? null
  }
}

module.exports = {
  OrganizationInputDTO
}
