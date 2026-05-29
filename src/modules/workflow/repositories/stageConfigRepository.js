const {
  StageConfig
} = require('../../../entities')

class StageConfigRepository {

  async bulkCreate(data) {

    return await StageConfig.bulkCreate(
      data
    )
  }

  async findByStageId(stageId) {

    return await StageConfig.findOne({

      where: {
        stage_id: stageId
      }
    })
  }
}

module.exports =
  new StageConfigRepository()