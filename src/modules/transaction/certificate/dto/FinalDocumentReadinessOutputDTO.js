'use strict'

class FinalDocumentReadinessOutputDTO {
  constructor (payload = {}) {
    this.transaction_id = payload.transaction_id
    this.transaction_status = payload.transaction_status
    this.ready_for_merge = Boolean(payload.ready_for_merge)
    this.ready_for_completion = Boolean(payload.ready_for_completion)
    this.checks = Array.isArray(payload.checks) ? payload.checks : []
    this.blocking_issues = Array.isArray(payload.blocking_issues)
      ? payload.blocking_issues
      : []
    this.generate_pdf = payload.generate_pdf ?? null
    this.uploaded_files = payload.uploaded_files ?? []
    this.integrity_chain = payload.integrity_chain ?? null
    this.final_qr = payload.final_qr ?? null
  }
}

module.exports = {
  FinalDocumentReadinessOutputDTO
}
