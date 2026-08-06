'use strict'

const { parseDateBound } = require('../../../../core/utils/dateBound')

class DatePickerOutputDTO {
  constructor (row) {
    const plain =
      row && typeof row.get === 'function'
        ? row.get({ plain: true })
        : row

    this.id = plain?.id
    this.id_widget = plain?.id_widget
    this.label = plain?.label
    this.is_required = plain?.is_required
    this.min_date = parseDateBound(plain?.min_date)
    this.max_date = parseDateBound(plain?.max_date)
    this.created_at = plain?.created_at
    this.updated_at = plain?.updated_at
  }
}

module.exports = {
  DatePickerOutputDTO
}
