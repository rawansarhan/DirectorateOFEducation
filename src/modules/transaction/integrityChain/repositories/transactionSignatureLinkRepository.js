'use strict'

const { TransactionSignatureLink, DigitalSignature, UserKey, User } = require('../../../../entities')

class TransactionSignatureLinkRepository {
  async create (data, options = {}) {
    return TransactionSignatureLink.create(data, options)
  }

  async findByTransactionIdOrdered (transactionId) {
    return TransactionSignatureLink.findAll({
      where: { transaction_id: transactionId },
      order: [['signature_order', 'ASC']]
    })
  }

  async findLatestByTransactionId (transactionId) {
    return TransactionSignatureLink.findOne({
      where: { transaction_id: transactionId },
      order: [['signature_order', 'DESC']]
    })
  }

  async countByTransactionId (transactionId) {
    return TransactionSignatureLink.count({
      where: { transaction_id: transactionId }
    })
  }

  /**
   * موقّعو سلسلة النزاهة مع بيانات هوية الموظف من users.
   */
  async findSignersWithIdentityByTransactionId (transactionId) {
    return TransactionSignatureLink.findAll({
      where: { transaction_id: transactionId },
      attributes: [
        'signature_order',
        'stage_code',
        'signed_at',
        'digital_signature_id'
      ],
      include: [
        {
          model: DigitalSignature,
          as: 'digital_signature',
          attributes: ['id', 'signature_order', 'signed_at', 'user_key_id'],
          required: true,
          include: [
            {
              model: UserKey,
              as: 'user_key',
              attributes: ['id', 'user_id', 'key_fingerprint'],
              required: true,
              include: [
                {
                  model: User,
                  as: 'user',
                  attributes: [
                    'id',
                    'first_name',
                    'last_name',
                    'father_name',
                    'mother_name',
                    'national_id'
                  ],
                  required: false
                }
              ]
            }
          ]
        }
      ],
      order: [['signature_order', 'ASC']]
    })
  }
}

module.exports = new TransactionSignatureLinkRepository()
