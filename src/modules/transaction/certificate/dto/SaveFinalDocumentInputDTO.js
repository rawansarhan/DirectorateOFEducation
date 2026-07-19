'use strict'

class SaveFinalDocumentInputDTO {
  constructor ({
    transactionId,
    userId,
    file = null,
    qrPayloadSnapshot = null
  }) {
    this.transactionId = transactionId
    this.userId = userId
    this.file = file
    this.qrPayloadSnapshot = qrPayloadSnapshot
  }
}

module.exports = {
  SaveFinalDocumentInputDTO
}
