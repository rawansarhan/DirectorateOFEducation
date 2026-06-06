'use strict'

class TaskDetailsOutputDTO {
  constructor ({
    task,
    processInstance,
    transaction,
    taskLock,
    previousStagesData,
    currentStageConfig
  }) {
    this.task = {
      id: task.id,
      name: task.name,
      taskDefinitionKey: task.taskDefinitionKey,
      created: task.created
    }

    this.process = {
      id: processInstance.id,
      processDefinitionId: processInstance.process_definition_id
    }

    this.transaction = {
      id: transaction?.id ?? null,
      code: transaction?.code ?? null,
      status: transaction?.status ?? null,
      version: transaction?.version ?? null
    }

    this.taskLock = taskLock
    this.previousStagesData = previousStagesData

    this.currentStage = {
      id: processInstance.current_stage?.id ?? null,
      name: processInstance.current_stage?.name ?? null,
      code: processInstance.current_stage?.code ?? null,
      config: currentStageConfig || {}
    }
  }
}

module.exports = {
  TaskDetailsOutputDTO
}
