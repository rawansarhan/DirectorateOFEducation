'use strict'

class DatePickerInputDTO {
  constructor ({
    label,
    is_required = false,
    min_date,
    max_date
  }) {
    this.label = label
    this.is_required = is_required
    this.min_date = min_date
    this.max_date = max_date
  }
}

module.exports = {
  DatePickerInputDTO
}
