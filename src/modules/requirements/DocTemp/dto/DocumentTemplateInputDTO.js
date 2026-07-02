'use strict'

class DocumentTemplateInputDTO {
  constructor ({
    name,
    file_path,
    type_doc_id,
    engine_type = 'ACROFORM',
    config_json = null,
    version = 1,
    is_active = true,
    is_latest = true
  }) {
    this.name = name
    this.file_path = file_path
    this.type_doc_id = type_doc_id
    this.engine_type = engine_type
    this.config_json = config_json
    this.version = version
    this.is_active = is_active
    this.is_latest = is_latest
  }
}

module.exports = {
  DocumentTemplateInputDTO
}
