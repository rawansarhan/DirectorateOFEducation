'use strict'

const { ProcessInstanceStage } = require('../../../../entities')

class ProcessInstanceStageRepository {
  async create (data, dbTransaction = null) {
    return ProcessInstanceStage.create(data, { transaction: dbTransaction })
  }

  async findByTransactionAndStageCode (transactionId, stageCode, dbTransaction = null) {
    return ProcessInstanceStage.findOne({
      where: {
        transaction_id: transactionId,
        stage_code: stageCode
      },
      order: [['created_at', 'ASC']],
      transaction: dbTransaction
    })
  }

  async findSealedByTransactionId (transactionId, dbTransaction = null) {
    return ProcessInstanceStage.findAll({
      where: {
        transaction_id: transactionId,
        sealed: true
      },
      transaction: dbTransaction
    })
  }

  async findByTransactionId (transactionId, dbTransaction = null) {
    return ProcessInstanceStage.findAll({
      where: {
        transaction_id: transactionId
      },
      order: [['created_at', 'ASC']],
      transaction: dbTransaction
    })
  }
}

module.exports = new ProcessInstanceStageRepository()
