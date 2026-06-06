'use strict'

const { ProcessInstanceStage } = require('../../../../entities')

class ProcessInstanceStageRepository {
  async create (data) {
    return ProcessInstanceStage.create(data)
  }
}

module.exports = new ProcessInstanceStageRepository()
