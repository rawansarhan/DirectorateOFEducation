'use strict'

class FilePickerOutputDTO {
  constructor (row) {
    const plain =
      row && typeof row.get === 'function'
        ? row.get({ plain: true })
        : row

    this.id = plain?.id
    this.id_widget = plain?.id_widget
    this.label = plain?.label
    this.is_required = plain?.is_required
    this.max_size_mb = plain?.max_size_mb
    this.allowed_extensions = plain?.allowed_extensions ?? []
    this.allow_multiple = plain?.allow_multiple
    this.created_at = plain?.created_at
    this.updated_at = plain?.updated_at
  }
}

module.exports = {
  FilePickerOutputDTO
}
