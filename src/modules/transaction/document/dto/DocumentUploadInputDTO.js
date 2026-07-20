'use strict'

class DocumentUploadInputDTO {
  constructor ({
    file = null,
    key = null,
    typeDocId = null,
    userId
  }) {
    this.file = file
    this.key = key
    this.typeDocId = typeDocId
    this.userId = userId
  }
}

module.exports = {
  DocumentUploadInputDTO
}
