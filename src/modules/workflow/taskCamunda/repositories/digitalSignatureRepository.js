'use strict'

const { DigitalSignature, DocumentSignature, UserKey } = require('../../../../entities')

class DigitalSignatureRepository {
  async create (data, options = {}) {
    return DigitalSignature.create(data, options)
  }

  async findLatestByDocumentId (documentId) {
    return DigitalSignature.findOne({
      where: { document_id: documentId },
      order: [['signature_order', 'DESC']]
    })
  }

  async findLatestByTransactionId (transactionId) {
    return DigitalSignature.findOne({
      include: [{
        model: DocumentSignature,
        as: 'document',
        where: { transaction_id: transactionId },
        attributes: []
      }],
      order: [['signed_at', 'DESC']]
    })
  }

  async countByTransactionId (transactionId) {
    return DigitalSignature.count({
      include: [{
        model: DocumentSignature,
        as: 'document',
        where: { transaction_id: transactionId },
        attributes: []
      }]
    })
  }

  async countByDocumentId (documentId) {
    return DigitalSignature.count({
      where: { document_id: documentId }
    })
  }

  async findAllByTransactionIdOrdered (transactionId) {
    return DigitalSignature.findAll({
      include: [
        {
          model: DocumentSignature,
          as: 'document',
          where: { transaction_id: transactionId },
          attributes: ['id', 'transaction_id', 'file_path', 'file_hash'],
          required: true
        },
        {
          model: UserKey,
          as: 'user_key',
          attributes: ['id', 'public_key', 'key_fingerprint']
        }
      ],
      order: [['signature_order', 'ASC']]
    })
  }
}

module.exports = new DigitalSignatureRepository()
