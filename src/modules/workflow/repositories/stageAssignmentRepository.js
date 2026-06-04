const {
  StageAssignment
} = require('../../../entities')

class StageAssignmentRepository {

  async findByStageIds(stageIds) {

    return await StageAssignment.findAll({

      where: {
        stage_id: stageIds
      }
    })
  }

  async bulkCreate(data) {

    return await StageAssignment.bulkCreate(
      data
    )
  }
}

module.exports =
  new StageAssignmentRepository()