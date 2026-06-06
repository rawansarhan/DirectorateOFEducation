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
    this.file_type = plain?.file_type
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
