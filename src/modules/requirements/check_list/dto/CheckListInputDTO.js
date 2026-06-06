'use strict'

class CheckListInputDTO {
  constructor ({
    label,
    is_required = false,
    min_selected = 0,
    max_selected = 1,
    options = []
  }) {
    this.label = label
    this.is_required = is_required
    this.min_selected = min_selected
    this.max_selected = max_selected
    this.options = options
  }
}

module.exports = {
  CheckListInputDTO
}
