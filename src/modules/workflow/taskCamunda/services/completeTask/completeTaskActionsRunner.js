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

const { SERVICE_TASK_SYNC_STALE_MS } = require('../../../../../core/config/env')

// SERVICE_TASK القديمة في history Camunda لا تُنفَّذ retroactively عند أول sync
const SYNC_STALE_SERVICE_TASK_MS = SERVICE_TASK_SYNC_STALE_MS

function parseEndTimeMs (endTime) {
  if (!endTime) return 0
  const ms = new Date(endTime).getTime()
  return Number.isFinite(ms) ? ms : 0
}

function isStaleServiceTaskInstance (item, nowMs = Date.now()) {
  const endMs = parseEndTimeMs(item.endTime)
  if (!endMs) return false
  return nowMs - endMs > SYNC_STALE_SERVICE_TASK_MS
}

function updateServiceTaskWatermark (transactionData, instances = []) {
  let watermarkMs = parseEndTimeMs(transactionData._serviceTaskSyncWatermark)

  for (const item of instances) {
    const endMs = parseEndTimeMs(item.endTime)
    if (endMs > watermarkMs) {
      watermarkMs = endMs
    }
  }

  if (watermarkMs > 0) {
    transactionData._serviceTaskSyncWatermark = new Date(watermarkMs).toISOString()
  } else if (!transactionData._serviceTaskSyncWatermark) {
    transactionData._serviceTaskSyncWatermark = new Date().toISOString()
  }

  return transactionData
}

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
 *
 * source:
 * - complete / recovery: يُنفَّذ مباشرة بعد complete (المسار الرئيسي)
 * - sync: Job خلفي — لا يعيد تنفيذ SERVICE_TASK القديمة من history Camunda
 */
async function runServiceTaskActions ({
  processInstance,
  transaction,
  transactionData,
  task,
  userId,
  source = 'sync'
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

  // معاملات قديمة بلا watermark: سجّل كل history الحالي مرة واحدة بدون إعادة إشعارات
  if (source === 'sync' && !parseEndTimeMs(transactionData._serviceTaskSyncWatermark)) {
    let bootstrapped = 0

    for (const item of completedServiceTasks) {
      if (executedInstances.has(item.id)) {
        continue
      }

      executedInstances.add(item.id)
      legacyActivityIds.add(item.activityId)
      bootstrapped += 1
    }

    updateServiceTaskWatermark(transactionData, completedServiceTasks)

    if (!transactionData._serviceTaskSyncWatermark) {
      transactionData._serviceTaskSyncWatermark = new Date().toISOString()
    }

    transactionData._serviceTaskInstanceTracking = true

    if (bootstrapped > 0) {
      logStep('SERVICE_TASKS_BOOTSTRAP_HISTORY', {
        bootstrapped,
        transactionId: transaction.id
      })
    }
  }

  // أول sync بعد bootstrap: تجاهل SERVICE_TASK القديمة جداً في history
  if (source === 'sync' && parseEndTimeMs(transactionData._serviceTaskSyncWatermark)) {
    const nowMs = Date.now()
    let skippedStale = 0

    for (const item of completedServiceTasks) {
      if (executedInstances.has(item.id)) continue

      if (isStaleServiceTaskInstance(item, nowMs)) {
        executedInstances.add(item.id)
        legacyActivityIds.add(item.activityId)
        skippedStale += 1
      }
    }

    if (skippedStale > 0) {
      logStep('SERVICE_TASKS_SKIP_STALE_HISTORY', {
        skipped: skippedStale,
        transactionId: transaction.id
      })
    }
  }

  const watermarkMs = parseEndTimeMs(transactionData._serviceTaskSyncWatermark)

  const pending = completedServiceTasks.filter(item => {
    if (executedInstances.has(item.id)) {
      return false
    }

    if (source === 'complete' || source === 'recovery') {
      return true
    }

    const endMs = parseEndTimeMs(item.endTime)

    if (!endMs) {
      return true
    }

    if (watermarkMs > 0 && endMs <= watermarkMs) {
      return false
    }

    return true
  })

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
  updateServiceTaskWatermark(transactionData, pending)

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
