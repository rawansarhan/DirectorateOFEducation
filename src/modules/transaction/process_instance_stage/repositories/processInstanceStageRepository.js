'use strict'

const { ProcessInstanceStage } = require('../../../../entities')

class ProcessInstanceStageRepository {
  async create (data, dbTransaction = null) {
    return ProcessInstanceStage.create(data, { transaction: dbTransaction })
  }
}

module.exports = new ProcessInstanceStageRepository()
