'use strict'

class CertificateSignerOutputDTO {
  constructor (payload = {}) {
    this.signature_order = payload.signature_order ?? null
    this.stage_code = payload.stage_code ?? null
    this.stage_name = payload.stage_name ?? null
    this.signed_at = payload.signed_at ?? null
    this.user_id = payload.user_id ?? null
    this.first_name = payload.first_name ?? null
    this.last_name = payload.last_name ?? null
    this.father_name = payload.father_name ?? null
    this.mother_name = payload.mother_name ?? null
    this.national_id = payload.national_id ?? null
  }
}

module.exports = {
  CertificateSignerOutputDTO
}
