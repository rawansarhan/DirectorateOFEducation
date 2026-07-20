'use strict'

class GeneratedDocumentOutputDTO {
  constructor ({
    document_instance_id,
    document_template_id,
    file_path = null,
    file_url = null,
    content_hash = null,
    status = null,
    generated_at = null
  }) {
    this.document_instance_id = document_instance_id
    this.document_template_id = document_template_id
    this.file_path = file_path
    this.file_url = file_url
    this.content_hash = content_hash
    this.status = status
    this.generated_at = generated_at
  }
}

module.exports = {
  GeneratedDocumentOutputDTO
}
