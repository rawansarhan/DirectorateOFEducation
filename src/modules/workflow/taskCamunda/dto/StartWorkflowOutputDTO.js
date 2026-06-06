'use strict'

class StartWorkflowOutputDTO {
  constructor ({
    transaction,
    processInstance,
    camundaProcess,
    completeTaskResult
  }) {
    this.transactionId = transaction.id
    this.processInstanceId = processInstance.id
    this.camundaProcessInstanceId = camundaProcess.id
    this.currentTask = completeTaskResult?.data?.nextTask || null
    this.workflowStatus = 'running'
  }
}

module.exports = {
  StartWorkflowOutputDTO
}
