'use strict'


class FieldOutputDTO {
  constructor (field) {
    const plain =
      field && typeof field.get === 'function'
        ? field.get({ plain: true })
        : field

    this.id = plain?.id
    this.field_name = plain?.field_name
    this.field_type = plain?.field_type
    this.list_json = plain?.list_json
    this.created_at = plain?.created_at
    this.updated_at = plain?.updated_at
  }
}

module.exports = {
  FieldOutputDTO
}
