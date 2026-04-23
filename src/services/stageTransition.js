const { StageTransition, Stage } = require('../entities')

async function createStageTransitionService(data) {

  const from = await Stage.findByPk(data.from_stage_id)
  const to = await Stage.findByPk(data.to_stage_id)

  if (!from || !to) {
    throw new Error('Stage غير موجود')
  }

  if (from.process_definition_id !== to.process_definition_id) {
    throw new Error('لا يمكن الربط بين عمليتين مختلفتين')
  }

  const transition = await StageTransition.create(data)

  return transition
}

module.exports = { createStageTransitionService }