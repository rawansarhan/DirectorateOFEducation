'use strict'

class FilePickerInputDTO {
  constructor ({
    label,
    is_required = false,
    max_size_mb,
    allowed_extensions = [],
    allow_multiple = false
  }) {
    this.label = label
    this.is_required = is_required
    this.max_size_mb = max_size_mb
    this.allowed_extensions = allowed_extensions
    this.allow_multiple = allow_multiple
  }
}

module.exports = {
  FilePickerInputDTO
}
