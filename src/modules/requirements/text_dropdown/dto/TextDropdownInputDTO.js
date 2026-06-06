'use strict'

class TextDropdownInputDTO {
  constructor ({
    label,
    is_required = false,
    options = []
  }) {
    this.label = label
    this.is_required = is_required
    this.options = options
  }
}

module.exports = {
  TextDropdownInputDTO
}
