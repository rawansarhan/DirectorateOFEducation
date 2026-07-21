'use strict'

const { TaskDetailsOutputDTO } = require('../dto/TaskDetailsOutputDTO')

function toTaskDetails ({
  task,
  processInstance,
  transaction,
  previousStagesData,
  activeStage = null,
  currentStageConfig = null,
  processDefinition = null,
  assignments = null
}) {
  const resolvedStage = activeStage || processInstance.current_stage
  const resolvedConfig =
    currentStageConfig ??
    processInstance.current_stage?.stage_config?.config_json ??
    {}

  return new TaskDetailsOutputDTO({
    task,
    processInstance,
    transaction,
    previousStagesData,
    activeStage: resolvedStage,
    currentStageConfig: resolvedConfig,
    processDefinition,
    assignments
  })
}

module.exports = {
  toTaskDetails
}
