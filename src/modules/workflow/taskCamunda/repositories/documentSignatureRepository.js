'use strict'

const { DocumentSignature, DigitalSignature, UserKey } = require('../../../../entities')

class DocumentSignatureRepository {
  async create (data, options = {}) {
    return DocumentSignature.create(data, options)
  }

  async findLatestByTransactionId (transactionId) {
    return DocumentSignature.findOne({
      where: { transaction_id: transactionId },
      order: [['created_at', 'DESC']]
    })
  }

  async findAllWithSignaturesByTransactionId (transactionId) {
    return DocumentSignature.findAll({
      where: { transaction_id: transactionId },
      include: [{
        model: DigitalSignature,
        as: 'signatures',
        include: [{
          model: UserKey,
          as: 'user_key',
          attributes: ['id', 'key_fingerprint', 'algorithm']
        }]
      }],
      order: [
        ['created_at', 'ASC'],
        [{ model: DigitalSignature, as: 'signatures' }, 'signed_at', 'ASC']
      ]
    })
  }
}

module.exports = new DocumentSignatureRepository()
