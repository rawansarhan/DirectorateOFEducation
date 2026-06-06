'use strict'

class TextFieldInputDTO {
  constructor ({
    label,
    is_required = false,
    input_type,
    regex = null,
    max_length = null,
    min_length = null
  }) {
    this.label = label
    this.is_required = is_required
    this.input_type = input_type
    this.regex = regex
    this.max_length = max_length
    this.min_length = min_length
  }
}

module.exports = {
  TextFieldInputDTO
}
