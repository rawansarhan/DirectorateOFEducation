'use strict'

class TransactionDocumentsOutputDTO {
  constructor ({
    transaction_id,
    status,
    generated_documents = [],
    uploaded_files = [],
    final_qr = null
  }) {
    this.transaction_id = transaction_id
    this.status = status
    this.generated_documents = generated_documents
    this.uploaded_files = uploaded_files
    this.final_qr = final_qr
  }
}

module.exports = {
  TransactionDocumentsOutputDTO
}
