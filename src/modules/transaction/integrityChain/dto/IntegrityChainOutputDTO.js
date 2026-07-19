'use strict'

class IntegrityChainOutputDTO {
  constructor (payload = {}) {
    this.transaction_id = payload.transaction_id
    this.transaction_status = payload.transaction_status
    this.genesis_hash = payload.genesis_hash
    this.schema_version = payload.schema_version
    this.chain_status = payload.chain_status
    this.total_links = payload.total_links
    this.head_hash = payload.head_hash ?? null
    this.qr_payload = payload.qr_payload ?? null
    this.links = Array.isArray(payload.links) ? payload.links : []
    this.last_verification = payload.last_verification ?? null
  }
}

module.exports = {
  IntegrityChainOutputDTO
}
