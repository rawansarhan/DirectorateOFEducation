'use strict'

class PublicDocumentVerifyOutputDTO {
  constructor (payload = {}) {
    this.valid = Boolean(payload.valid)
    this.message = payload.message
    this.verified_at = payload.verified_at || new Date()

    if (payload.identity) {
      this.identity = payload.identity
    }

    if (payload.details_code) {
      this.details_code = payload.details_code
      this.details_code_expires_in_seconds =
        payload.details_code_expires_in_seconds ?? null
    }
  }
}

module.exports = {
  PublicDocumentVerifyOutputDTO
}
