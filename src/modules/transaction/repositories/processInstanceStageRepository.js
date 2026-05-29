const {
  ProcessInstanceStage
} = require('../../../entities')

class ProcessInstanceStageRepository {

  async create(data) {

    return await ProcessInstanceStage.create(
      data
    )
  }
}

module.exports =
  new ProcessInstanceStageRepository()