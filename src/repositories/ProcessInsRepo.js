const axios = require('axios')
const { ProcessInstance, Stage, StageConfig } = require('../entities')

async function getCurrentStageData(processInstanceId) {

  const instance = await ProcessInstance.findByPk(processInstanceId)

  if (!instance) throw new Error('المعاملة غير موجودة')

  // 🔥 1. جيب current task من Camunda
  const { data: tasks } = await axios.get(
    `${process.env.CAMUNDA_URL}/task?processInstanceId=${instance.camunda_process_instance_id}`
  )

  if (!tasks.length) {
    return {
      instance,
      stage: null // انتهت العملية
    }
  }

  const currentTask = tasks[0]

  // 🔥 2. اربط مع Stage عبر taskDefinitionKey
  const stage = await Stage.findOne({
    where: {
      process_definition_id: instance.process_definition_id,
      code: currentTask.taskDefinitionKey
    },
    include: [
      {
        model: StageConfig,
        as: 'stage_configs'
      }
    ]
  })

  if (!stage) {
    throw new Error('Stage غير معرف لهذا task')
  }

  return {
    instance,
    stage,
    camundaTask: currentTask
  }
}

module.exports = { getCurrentStageData }