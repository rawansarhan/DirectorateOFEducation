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
    this.workflowStatus = completeTaskResult?.data?.workflow_status || 'running'
    this.currentTask = null
  }
}

module.exports = {
  StartWorkflowOutputDTO
}
