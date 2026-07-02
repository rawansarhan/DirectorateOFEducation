'use strict'

class DocumentTemplateOutputDTO {
  constructor (row) {
    const plain =
      row && typeof row.get === 'function'
        ? row.get({ plain: true })
        : row

    this.id = plain?.id
    this.name = plain?.name
    this.file_path = plain?.file_path
    this.type_doc_id = plain?.type_doc_id
    this.type_doc = plain?.type_doc
      ? {
          id: plain.type_doc.id,
          name: plain.type_doc.name
        }
      : null
    this.engine_type = plain?.engine_type
    this.config_json = plain?.config_json ?? null
    this.version = plain?.version
    this.is_latest = plain?.is_latest
    this.is_active = plain?.is_active
    this.created_at = plain?.created_at
    this.updated_at = plain?.updated_at
  }
}

module.exports = {
  DocumentTemplateOutputDTO
}
