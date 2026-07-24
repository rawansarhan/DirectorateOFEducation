'use strict'

const camundaClient = require('../../../../../core/shared/clients/camunda/camundaClient')
const ActionStrategyFactory = require('../../../actions/ActionStrategyFactory')
const stageConfigRepository = require('../../../stageConfig/repositories/stageConfigRepository')
const stageRepository = require('../../../processDefinition/repositories/stageRepository')
const {
  normalizeActionPayload,
  resolveActionsForStage
} = require('../../../actions/actionHelpers')
const { extractPdfFieldsFromActionResults } = require('../../utils/generatedPdfHistory')
const { logStep } = require('./completeTaskHelpers')

async function executeActions (actions, context) {
  logStep('ACTIONS_START', {
    count: actions.length,
    stageCode: context.stage?.code,
    transactionId: context.transaction?.id
  })

  const results = []

  for (const action of actions) {
    logStep('ACTION_EXECUTE', { action: action.name })

    const strategy = ActionStrategyFactory.make(action.name)
    const actionPayload = normalizeActionPayload(action)

    const result = await strategy.execute({
      payload: actionPayload,
      context
    })

    logStep('ACTION_DONE', {
      action: action.name,
      status: result?.status || 'ok'
    })

    results.push({
      name: action.name,
      ...actionPayload,
      result
    })
  }

  logStep('ACTIONS_DONE', { count: results.length })

  return results
}

/**
 * ينفّذ actions لكل SERVICE_TASK مكتملة في Camunda ولم تُعالج بعد.
 * التتبّع بـ activityInstanceId حتى يتكرر مسار التايمر (R/PT5M) بشكل صحيح.
 */
async function runServiceTaskActions ({
  processInstance,
  transaction,
  transactionData,
  task,
  userId
}) {
  logStep('SERVICE_TASKS_CHECK', {
    processInstanceId: processInstance.id,
    transactionId: transaction.id
  })

  const completedServiceTasks =
    await camundaClient.getCompletedServiceTasks(
      processInstance.camunda_process_instance_id
    )

  const executedInstances = new Set(
    transactionData._executedServiceTaskInstances || []
  )
  const legacyActivityIds = new Set(
    transactionData._executedServiceTasks || []
  )

  // ترحيل آمن من التتبّع القديم (activityId) → instances بدون إعادة تنفيذ
  if (!transactionData._serviceTaskInstanceTracking) {
    for (const item of completedServiceTasks) {
      if (legacyActivityIds.has(item.activityId)) {
        executedInstances.add(item.id)
      }
    }
    transactionData._serviceTaskInstanceTracking = true
  }

  const pending = completedServiceTasks.filter(
    item => !executedInstances.has(item.id)
  )

  if (!pending.length) {
    transactionData._executedServiceTaskInstances = [...executedInstances]
    transactionData._executedServiceTasks = [...legacyActivityIds]
    logStep('SERVICE_TASKS_NONE')
    return transactionData
  }

  logStep('SERVICE_TASKS_FOUND', {
    keys: pending.map(item => `${item.activityId}:${item.id}`).join(',')
  })

  for (const item of pending) {
    const taskKey = item.activityId
    const activityInstanceId = item.id

    const serviceStage = await stageRepository.findByCodeAndProcess(
      processInstance.process_definition_id,
      taskKey
    )

    if (!serviceStage || serviceStage.type !== 'SERVICE_TASK') {
      logStep('SERVICE_TASK_SKIP', {
        taskKey,
        activityInstanceId,
        reason: 'not_service_task'
      })
      executedInstances.add(activityInstanceId)
      legacyActivityIds.add(taskKey)
      continue
    }

    const stageConfig =
      await stageConfigRepository.findByStageId(serviceStage.id)

    const actions = resolveActionsForStage(serviceStage, stageConfig)

    if (!actions.length) {
      logStep('SERVICE_TASK_SKIP', {
        taskKey,
        activityInstanceId,
        reason: 'no_actions'
      })
      executedInstances.add(activityInstanceId)
      legacyActivityIds.add(taskKey)
      continue
    }

    logStep('SERVICE_TASK_RUN', {
      taskKey,
      activityInstanceId,
      stageCode: serviceStage.code,
      actionCount: actions.length
    })

    const actionResults = await executeActions(actions, {
      task,
      transaction,
      processInstance,
      stage: serviceStage,
      userId
    })

    const pdfFields = extractPdfFieldsFromActionResults(actionResults) || {}

    transactionData[serviceStage.code] = {
      ...(transactionData[serviceStage.code] || {}),
      stage_name: serviceStage.name,
      form_id: stageConfig?.config_json?.form_id ?? serviceStage.code,
      form_name: stageConfig?.config_json?.form_name ?? serviceStage.name,
      actions: [
        ...(transactionData[serviceStage.code]?.actions || []),
        ...actionResults
      ],
      executed_at: new Date(),
      executed_by: 'system',
      completed_by: null,
      completed_at: new Date(),
      last_activity_instance_id: activityInstanceId,
      ...pdfFields
    }

    executedInstances.add(activityInstanceId)
    legacyActivityIds.add(taskKey)
  }

  transactionData._executedServiceTaskInstances = [...executedInstances]
  transactionData._executedServiceTasks = [...legacyActivityIds]

  logStep('SERVICE_TASKS_DONE')

  return transactionData
}

async function runCurrentStageActions ({
  payload,
  stage,
  stageConfig,
  task,
  transaction,
  processInstance,
  userId
}) {
  logStep('PHASE_9_EXECUTE_ACTIONS', { stageType: stage.type })

  if (Array.isArray(payload.actions) && payload.actions.length) {
    await executeActions(payload.actions, {
      task,
      transaction,
      processInstance,
      stage,
      userId
    })
    return
  }

  if (stage.type === 'SERVICE_TASK') {
    const autoActions = resolveActionsForStage(stage, stageConfig)

    if (autoActions.length) {
      await executeActions(autoActions, {
        task,
        transaction,
        processInstance,
        stage,
        userId
      })
      return
    }

    logStep('ACTIONS_SKIP', { reason: 'no_actions_configured' })
    return
  }

  logStep('ACTIONS_SKIP', { reason: 'user_task_no_payload_actions' })
}

module.exports = {
  executeActions,
  runServiceTaskActions,
  runCurrentStageActions
}
