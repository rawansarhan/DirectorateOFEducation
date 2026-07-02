'use strict'

const { TransactionSignatureLink } = require('../../../../entities')

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
}

module.exports = new TransactionSignatureLinkRepository()
