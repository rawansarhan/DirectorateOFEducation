const { Stage } = require('../../../../entities')

class StageRepository {
///////////////////////////////////////////////
// ================ find stage by process ====
  async findCodesByProcessId (processId) {
    const stages = await Stage.findAll({
      where: {
        process_definition_id: processId
      },
      attributes: ['code']
    })

    return stages.map(s => s.code)
  }
///////////////////////////////////////////////
//=========== create stage ===================

  async bulkCreate (stagesData) {
    return await Stage.bulkCreate(stagesData, {
      returning: true
    })
  }
//////////////////////////////////////////////
//============= find by code and process =====

  async findByCodeAndProcess (processId, code) {
    return await Stage.findOne({
      where: {
        process_definition_id: processId,
        code
      }
    })
  }

  async findByIds(ids) {

    return await Stage.findAll({
      where: {
        id: ids
      }
    })
  }

  async findById (id) {
    return Stage.findByPk(id)
  }


  async findFirstAuthStage(processId) {

    return await Stage.findOne({

      where: {
        process_definition_id: processId,
        auth_type: 'AUTH'
      },

      order: [['id', 'ASC']]
    })
  }

  async findFirstByProcessId (processId) {
    return Stage.findOne({
      where: {
        process_definition_id: processId
      },
      order: [['id', 'ASC']]
    })
  }
}

module.exports = new StageRepository()
