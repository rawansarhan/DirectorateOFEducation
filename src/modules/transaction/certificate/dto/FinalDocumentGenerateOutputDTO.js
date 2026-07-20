'use strict'

const { FinalDocumentOutputDTO } = require('./FinalDocumentOutputDTO')

class FinalDocumentGenerateOutputDTO {
  constructor (payload = {}) {
    this.transaction_id = payload.transaction_id
    this.already_exists = Boolean(payload.already_exists)
    this.final_document = payload.final_document
      ? new FinalDocumentOutputDTO(payload.final_document, {
        includeQrSnapshot: false
      })
      : null
    this.final_qr = payload.final_qr ?? null
    this.merge_summary = payload.merge_summary ?? null
  }
}

module.exports = {
  FinalDocumentGenerateOutputDTO
}
