'use strict'

class UploadedFileOutputDTO {
  constructor ({
    document_id,
    file_path,
    file_url = null,
    type_doc_id = null,
    type_doc = null,
    type_doc_name = null,
    signatures_count = 0,
    uploaded_at = null
  }) {
    this.document_id = document_id
    this.file_path = file_path
    this.file_url = file_url
    this.type_doc_id = type_doc_id
    this.type_doc = type_doc
    this.type_doc_name = type_doc_name
    this.signatures_count = signatures_count
    this.uploaded_at = uploaded_at
  }
}

module.exports = {
  UploadedFileOutputDTO
}
