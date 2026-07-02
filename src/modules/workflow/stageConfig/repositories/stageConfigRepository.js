const {
  StageConfig
} = require('../../../../entities')

class StageConfigRepository {

  async bulkCreate(data) {

    return await StageConfig.bulkCreate(
      data
    )
  }

  async findByStageId (stageId) {
    return await StageConfig.findOne({
      where: { stage_id: stageId }
    })
  }

  async findByStageIds (stageIds) {
    if (!stageIds?.length) {
      return []
    }

    return await StageConfig.findAll({
      where: { stage_id: stageIds }
    })
  }
}

module.exports =
  new StageConfigRepository()