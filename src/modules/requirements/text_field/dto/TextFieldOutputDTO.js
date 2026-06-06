'use strict'

class TextFieldOutputDTO {
  constructor (row) {
    const plain =
      row && typeof row.get === 'function'
        ? row.get({ plain: true })
        : row

    this.id = plain?.id
    this.id_widget = plain?.id_widget
    this.label = plain?.label
    this.is_required = plain?.is_required
    this.input_type = plain?.input_type
    this.regex = plain?.regex ?? null
    this.max_length = plain?.max_length ?? null
    this.min_length = plain?.min_length ?? null
    this.created_at = plain?.created_at
    this.updated_at = plain?.updated_at
  }
}

module.exports = {
  TextFieldOutputDTO
}
