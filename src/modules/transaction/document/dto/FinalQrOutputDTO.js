'use strict'

class FinalQrOutputDTO {
  constructor (payload = {}) {
    this.available = Boolean(payload.available)

    if (!this.available) {
      this.message = payload.message || 'رمز QR غير متاح'
      return
    }

    this.transaction_id = payload.transaction_id
    this.genesis_hash = payload.genesis_hash
    this.document_instance_id = payload.document_instance_id
    this.content_hash = payload.content_hash ?? null
    this.signature = payload.signature
    this.verification_url = payload.verification_url
  }
}

module.exports = {
  FinalQrOutputDTO
}
