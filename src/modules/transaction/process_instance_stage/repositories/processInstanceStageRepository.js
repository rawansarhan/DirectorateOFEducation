'use strict'

const { ProcessInstanceStage } = require('../../../../entities')

class ProcessInstanceStageRepository {
  async create (data, dbTransaction = null) {
    return ProcessInstanceStage.create(data, { transaction: dbTransaction })
  }

  async findByTransactionAndStageCode (transactionId, stageCode) {
    return ProcessInstanceStage.findOne({
      where: {
        transaction_id: transactionId,
        stage_code: stageCode
      },
      order: [['created_at', 'ASC']]
    })
  }
}

module.exports = new ProcessInstanceStageRepository()
