'use strict'

class TypeDocOutputDTO {
  constructor (row) {
    this.id = row.id
    this.name = row.name
    this.is_active = row.is_active
    this.created_at = row.created_at
    this.updated_at = row.updated_at
  }
}

module.exports = {
  TypeDocOutputDTO
}
