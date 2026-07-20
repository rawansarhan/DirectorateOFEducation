'use strict'

class DocumentQrScanBundleOutputDTO {
  constructor (payload = {}) {
    this.transaction = payload.transaction ?? null
    this.applicant = payload.applicant ?? null
    this.signers = Array.isArray(payload.signers) ? payload.signers : []
    this.transaction_history = payload.transaction_history ?? null
    this.final_document = payload.final_document ?? null
  }
}

module.exports = {
  DocumentQrScanBundleOutputDTO
}
