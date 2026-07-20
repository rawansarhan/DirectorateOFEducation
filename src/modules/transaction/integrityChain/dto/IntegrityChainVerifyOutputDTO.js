'use strict'

class IntegrityChainVerifyOutputDTO {
  constructor (payload = {}) {
    this.transaction_id = payload.transaction_id
    this.transaction_status = payload.transaction_status
    this.genesis_hash = payload.genesis_hash
    this.schema_version = payload.schema_version
    this.chain_status = payload.chain_status
    this.total_links = payload.total_links
    this.head_hash = payload.head_hash ?? null
    this.valid = Boolean(payload.valid)
    this.issues = Array.isArray(payload.issues) ? payload.issues : []
    this.verified_at = payload.verified_at || new Date()
  }
}

module.exports = {
  IntegrityChainVerifyOutputDTO
}
