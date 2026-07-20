'use strict'

const { StartWorkflowOutputDTO } = require('../dto/StartWorkflowOutputDTO')

function toStartWorkflow ({
  transaction,
  processInstance,
  camundaProcess,
  completeTaskResult
}) {
  return new StartWorkflowOutputDTO({
    transaction,
    processInstance,
    camundaProcess,
    completeTaskResult
  })
}

module.exports = {
  toStartWorkflow
}
