'use strict'

class FieldInputDTO {
  constructor ({ field_name, field_type, list_json }) {
    this.field_name = field_name
    this.field_type = field_type
    this.list_json = list_json 
  }
}

module.exports = {
  FieldInputDTO
}
