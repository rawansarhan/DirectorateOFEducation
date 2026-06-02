'use strict'

const {
  TransactionSignatureLink,
  User,
  UserKey,
  DigitalSignature
} = require('../../../entities')

class TransactionSignatureLinkRepository {
  async create (data, options = {}) {
    return TransactionSignatureLink.create(data, options)
  }

  async findLatestByTransactionId (transactionId) {
    return TransactionSignatureLink.findOne({
      where: { transaction_id: transactionId },
      order: [['link_order', 'DESC']]
    })
  }

  async findAllByTransactionId (transactionId) {
    return TransactionSignatureLink.findAll({
      where: { transaction_id: transactionId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'userName', 'email']
        },
        {
          model: UserKey,
          as: 'user_key',
          attributes: ['id', 'key_fingerprint', 'public_key']
        },
        {
          model: DigitalSignature,
          as: 'digital_signature',
          attributes: [
            'id',
            'signature_value',
            'signed_hash',
            'previous_signature_hash',
            'signature_order',
            'signed_at'
          ]
        }
      ],
      order: [['link_order', 'ASC']]
    })
  }

  async countByTransactionId (transactionId) {
    return TransactionSignatureLink.count({
      where: { transaction_id: transactionId }
    })
  }
}

module.exports = new TransactionSignatureLinkRepository()
