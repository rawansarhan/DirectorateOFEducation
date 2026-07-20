'use strict'

class LocationInputDTO {
  constructor ({
    name,
    typeLocation_id,
    parent_id = null
  }) {
    this.name = name
    this.typeLocation_id = typeLocation_id
    this.parent_id = parent_id ?? null
  }
}

module.exports = {
  LocationInputDTO
}
