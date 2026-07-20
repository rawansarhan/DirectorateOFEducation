'use strict'

class IdentityPersonOutputDTO {
  constructor (source = {}) {
    this.first_name = source.first_name ?? null
    this.last_name = source.last_name ?? null
    this.father_name = source.father_name ?? null
    this.mother_name = source.mother_name ?? null
    this.national_id = source.national_id ?? null
  }
}

module.exports = {
  IdentityPersonOutputDTO
}
