'use strict'

const camundaClient = require('../../../../../core/shared/clients/camunda/camundaClient')
const {
  buildCamundaGatewayVariables
} = require('../../../services/unifiedFormPayloadService')
const { logStep } = require('./completeTaskHelpers')

async function completeCamundaTaskWithVariables ({
  task,
  stage,
  isReject,
  normalizedPayload,
  signingDecision
}) {
  logStep('PHASE_10_PREPARE_CAMUNDA_VARIABLES')

  const variables = buildCamundaGatewayVariables({
    isReject,
    gatewayValue: normalizedPayload.gateway_value,
    signingDecision
  })

  const routingValue = variables.value?.value || signingDecision || 'approve'

  logStep('CAMUNDA_VARIABLES_READY', { value: routingValue })

  logStep('PHASE_11_ASSERT_TASK_STILL_ACTIVE', { taskId: task.id })

  try {
    await camundaClient.getTaskById(task.id)
  } catch (err) {
    if (err.expose && err.details && typeof err.details === 'object') {
      err.details.stage_name = stage?.name || null
      err.details.stage_code = stage?.code || null
      err.details.hint =
        'المهمة كانت نشطة عند بدء الطلب لكن اختفت قبل الإكمال — غالباً إكمال مكرر أو طلب موازٍ.'
    }

    throw err
  }

  logStep('PHASE_11_COMPLETE_CAMUNDA_TASK', { taskId: task.id })

  try {
    await camundaClient.completeTask(task.id, variables)
  } catch (err) {
    if (err.expose && err.details && typeof err.details === 'object') {
      err.details.stage_name = stage?.name || null
      err.details.stage_code = stage?.code || null
    }

    throw err
  }

  logStep('CAMUNDA_TASK_COMPLETED', { taskId: task.id })

  return {
    variables,
    routingValue
  }
}

module.exports = {
  completeCamundaTaskWithVariables
}
