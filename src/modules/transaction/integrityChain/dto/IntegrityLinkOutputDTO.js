'use strict'

class IntegrityLinkOutputDTO {
  constructor (link = {}) {
    this.signature_order = link.signature_order
    this.stage_id = link.stage_id
    this.stage_code = link.stage_code
    this.stage_data_hash = link.stage_data_hash
    this.cumulative_hash = link.cumulative_hash
    this.link_hash = link.link_hash
    this.previous_link_hash = link.previous_link_hash
    this.digital_signature_id = link.digital_signature_id
    this.signed_at = link.signed_at
  }
}

module.exports = {
  IntegrityLinkOutputDTO
}
