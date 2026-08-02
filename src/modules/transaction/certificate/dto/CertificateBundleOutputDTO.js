'use strict'

const { FinalDocumentOutputDTO } = require('./FinalDocumentOutputDTO')

class CertificateBundleOutputDTO {
  constructor ({
    transaction_id,
    status,
    process_name = null,
    process_priority = null,
    submitted_at = null,
    completed_at = null,
    signers = [],
    transaction_history = null,
    final_document = null
  }) {
    this.transaction_id = transaction_id
    this.status = status
    this.process_name = process_name
    this.process_priority = process_priority
    this.submitted_at = submitted_at
    this.completed_at = completed_at
    this.signers = Array.isArray(signers) ? signers : []
    this.transaction_history = transaction_history
    this.final_document = final_document instanceof FinalDocumentOutputDTO
      ? final_document
      : new FinalDocumentOutputDTO(final_document || {
        available: false,
        message: 'لم يتم توليد نسخة pdf من هذا الطلب'
      }, { includeQrSnapshot: false })
  }
}

module.exports = {
  CertificateBundleOutputDTO
}
