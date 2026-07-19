'use strict'

class DocumentQrVerifyOutputDTO {
  constructor (payload = {}) {
    this.valid = Boolean(payload.valid)
    this.signature_valid = Boolean(payload.signature_valid)

    if (payload.reason !== undefined) {
      this.reason = payload.reason
    }

    if (payload.transaction_id !== undefined) {
      this.transaction_id = payload.transaction_id
    }

    if (payload.transaction_status !== undefined) {
      this.transaction_status = payload.transaction_status
    }

    if (payload.genesis_hash !== undefined) {
      this.genesis_hash = payload.genesis_hash
    }

    if (payload.document !== undefined) {
      this.document = payload.document
    }

    if (payload.chain !== undefined) {
      this.chain = payload.chain
    }

    this.verified_at = payload.verified_at || new Date()
  }
}

module.exports = {
  DocumentQrVerifyOutputDTO
}
