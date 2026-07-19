'use strict'

class DocumentUploadOutputDTO {
  constructor ({
    key,
    path,
    url = null,
    original_name = null,
    mime_type = null,
    type_doc_id,
    type_doc = null,
    content_hash = null,
    already_exists = false
  }) {
    this.key = key
    this.path = path
    this.url = url
    this.original_name = original_name
    this.mime_type = mime_type
    this.type_doc_id = type_doc_id
    this.type_doc = type_doc
    this.content_hash = content_hash
    this.already_exists = Boolean(already_exists)
  }
}

module.exports = {
  DocumentUploadOutputDTO
}
