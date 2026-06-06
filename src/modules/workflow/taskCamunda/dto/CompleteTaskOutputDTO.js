'use strict'

class CompleteTaskOutputDTO {
  constructor ({ task, stage, nextTask, transactionData }) {
    this.taskId = task.id
    this.currentStage = stage.name
    this.nextTask = nextTask?.name || null
    this.workflowStatus = nextTask ? 'running' : 'completed'
    this.transactionData = transactionData
  }
}

module.exports = {
  CompleteTaskOutputDTO
}
