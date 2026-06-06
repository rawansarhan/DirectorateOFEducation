'use strict'

class CheckListOutputDTO {
  constructor (row) {
    const plain =
      row && typeof row.get === 'function'
        ? row.get({ plain: true })
        : row

    this.id = plain?.id
    this.id_widget = plain?.id_widget
    this.label = plain?.label
    this.is_required = plain?.is_required
    this.min_selected = plain?.min_selected
    this.max_selected = plain?.max_selected
    this.options = plain?.options ?? []
    this.created_at = plain?.created_at
    this.updated_at = plain?.updated_at
  }
}

module.exports = {
  CheckListOutputDTO
}
