'use strict'

const camundaClient = require('../../../../../core/shared/clients/camunda/camundaClient')
const ActionStrategyFactory = require('../../../actions/ActionStrategyFactory')
const stageConfigRepository = require('../../../stageConfig/repositories/stageConfigRepository')
const stageRepository = require('../../../processDefinition/repositories/stageRepository')
const {
  normalizeActionPayload,
  resolveActionsForStage
} = require('../../../actions/actionHelpers')
const { extractPdfFieldsFromActionResults, attachGeneratedPdfsFromActionResults } = require('../../utils/generatedPdfHistory')
const { logStep } = require('./completeTaskHelpers')
const { createProcessStage } = require('../../../../transaction/public')

const { SERVICE_TASK_SYNC_STALE_MS } = require('../../../../../core/config/env')

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

function applyTrackingSets (transactionData, executedInstances, legacyActivityIds) {
  transactionData._executedServiceTaskInstances = [...executedInstances]
  transactionData._executedServiceTasks = [...legacyActivityIds]
  transactionData._serviceTaskInstanceTracking = true
  return transactionData
}

/**
 * يجهّز مجموعات التتبّع + قائمة pending بدون إرسال إشعارات.
 * يطبّق bootstrap/stale داخل transactionData (في الذاكرة).
 */
function prepareServiceTaskWork ({
  completedServiceTasks,
  transactionData,
  source = 'sync'
}) {
  const executedInstances = new Set(
    transactionData._executedServiceTaskInstances || []
  )
  const legacyActivityIds = new Set(
    transactionData._executedServiceTasks || []
  )

  let trackingChanged = false

  if (!transactionData._serviceTaskInstanceTracking) {
    for (const item of completedServiceTasks) {
      if (legacyActivityIds.has(item.activityId)) {
        executedInstances.add(item.id)
      }
    }
    transactionData._serviceTaskInstanceTracking = true
    trackingChanged = true
  }

  // معاملات قديمة بلا watermark: سجّل كل history الحالي مرة واحدة بدون إعادة إشعارات.
  //
  // مقصور على مسار الـ sync: معاملة جديدة تصل هنا أيضاً بلا watermark، فلو
  // طُبّق الـ bootstrap على مسار الإكمال لاعتُبرت الـ service tasks «منفّذة»
  // قبل تنفيذها فعلاً — فلا يُستدعى أي action ولو مرة (لا SEND_NOTIFICATION
  // ولا SYNC_SELF_CARD). فلتر الـ stale أدناه محمي بنفس الشرط.
  if (source === 'sync' && !parseEndTimeMs(transactionData._serviceTaskSyncWatermark)) {
    let bootstrapped = 0
//ه
    for (const item of completedServiceTasks) {
      if (executedInstances.has(item.id)) {
        continue
      }

      executedInstances.add(item.id)
      legacyActivityIds.add(item.activityId)
      bootstrapped += 1
      trackingChanged = true
    }
//هذه الدالة تحدث الwatermark لتتبع التاريخ والوقت للمهمة الخدمية في الداتابيز
    updateServiceTaskWatermark(transactionData, completedServiceTasks)
    //اذا لم  يكن هناك watermark في الداتا بيز فيتم اضافة التاريخ والوقت الحالي للمهمة الخدمية 
    if (!transactionData._serviceTaskSyncWatermark) {
      transactionData._serviceTaskSyncWatermark = new Date().toISOString()
    }

    transactionData._serviceTaskInstanceTracking = true
//اذا 
    if (bootstrapped > 0) {
      logStep('SERVICE_TASKS_BOOTSTRAP_HISTORY', {
        bootstrapped,
        transactionId: transactionData?.id || null
      })
    }
  }

  if (source === 'sync' && parseEndTimeMs(transactionData._serviceTaskSyncWatermark)) {
    const nowMs = Date.now()
    let skippedStale = 0

    for (const item of completedServiceTasks) {
      if (executedInstances.has(item.id)) continue

      if (isStaleServiceTaskInstance(item, nowMs)) {
        executedInstances.add(item.id)
        legacyActivityIds.add(item.activityId)
        skippedStale += 1
        trackingChanged = true
      }
    }

    if (skippedStale > 0) {
      logStep('SERVICE_TASKS_SKIP_STALE_HISTORY', { skipped: skippedStale })
    }
  }

  applyTrackingSets(transactionData, executedInstances, legacyActivityIds)

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

  return {
    transactionData,
    pending,
    executedInstances,
    legacyActivityIds,
    trackingChanged
  }
}

/**
 * يحجز (claim) الـ pending في الذاكرة قبل الإرسال حتى لا يُعاد تنفيذها.
 */
function claimPendingInMemory ({
  transactionData,
  pending,
  executedInstances,
  legacyActivityIds
}) {
  for (const item of pending) {
    executedInstances.add(item.id)
    legacyActivityIds.add(item.activityId)
  }

  applyTrackingSets(transactionData, executedInstances, legacyActivityIds)
  updateServiceTaskWatermark(transactionData, pending)

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

async function executePendingServiceTasks ({
  pending,
  processInstance,
  transaction,
  transactionData,
  task,
  userId
}) {
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

    const stageSnapshot = {
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

    transactionData[serviceStage.code] = stageSnapshot

    // سجّل اكتمال SERVICE_TASK في process_instance_stage حتى يدخل في progress_percent
    try {
      await createProcessStage({
        transactionId: transaction.id,
        stageCode: serviceStage.code,
        stageName: serviceStage.name,
        status: 'completed',
        data: stageSnapshot,
        assigned_to: null,
        sealed: true
      })
      logStep('SERVICE_TASK_STAGE_SEALED', {
        stageCode: serviceStage.code,
        transactionId: transaction.id
      })
    } catch (sealErr) {
      logStep('SERVICE_TASK_STAGE_SEAL_FAILED', {
        stageCode: serviceStage.code,
        transactionId: transaction.id,
        message: sealErr?.message || String(sealErr)
      })
      throw sealErr
    }

    // خزّن PDF داخل templates[] لمرحلة USER_TASK المرتبطة بنفس template_id
    const attached = attachGeneratedPdfsFromActionResults(
      transactionData,
      actionResults
    )
    transactionData = attached.data
  }

  return transactionData
}

/**
 * ينفّذ actions لكل SERVICE_TASK مكتملة في Camunda ولم تُعالج بعد.
 *
 * مهم: claim قبل الإرسال (at-most-once للإشعارات)
 * - claimAndPersist: يحفظ التتبّع في DB قبل SEND_NOTIFICATION
 *   حتى لا يعيد الـ sync job بعد دقيقة نفس الإشعار.
 *
 * source:
 * - complete / recovery: مسار الإكمال
 * - sync: Job خلفي
 */
async function runServiceTaskActions ({
  processInstance,
  transaction,
  transactionData,
  task,
  userId,
  source = 'sync',
  claimAndPersist = null
}) {
  logStep('SERVICE_TASKS_CHECK', {
    processInstanceId: processInstance.id,
    transactionId: transaction.id,
    source
  })

  const completedServiceTasks =
    await camundaClient.getCompletedServiceTasks(
      processInstance.camunda_process_instance_id
    )

  let work = prepareServiceTaskWork({
    completedServiceTasks,
    transactionData,
    source
  })

  transactionData = work.transactionData

  if (!work.pending.length) {
    logStep('SERVICE_TASKS_NONE')
    return transactionData
  }

  logStep('SERVICE_TASKS_FOUND', {
    keys: work.pending.map(item => `${item.activityId}:${item.id}`).join(',')
  })

  // 1) احجز المعرفات في الذاكرة قبل أي إشعار
  transactionData = claimPendingInMemory({
    transactionData,
    pending: work.pending,
    executedInstances: work.executedInstances,
    legacyActivityIds: work.legacyActivityIds
  })

  // 2) احفظ الحجز في DB إن وُجد — يمنع التكرار بين دورتَي sync / complete
  if (typeof claimAndPersist === 'function') {
    const claimResult = await claimAndPersist(transactionData)

    if (!claimResult?.ok) {
      logStep('SERVICE_TASKS_CLAIM_SKIP', {
        reason: claimResult?.reason || 'claim_failed',
        transactionId: transaction.id
      })
      return claimResult?.transactionData || transactionData
    }

    transactionData = claimResult.transactionData || transactionData

    // نفّذ فقط ما حجزه هذا الـ worker — يمنع الإشعار المكرر عند السباق
    const claimedSet = new Set(transactionData.__claimedServiceTaskIds || [])
    delete transactionData.__claimedServiceTaskIds

    const stillOurs = claimedSet.size
      ? work.pending.filter(item => claimedSet.has(item.id))
      : []

    work = { ...work, pending: stillOurs }

    if (!work.pending.length) {
      logStep('SERVICE_TASKS_CLAIM_EMPTY', { transactionId: transaction.id })
      return transactionData
    }
  }

  // 3) أرسل الإشعارات / نفّذ actions بعد الحجز الناجح فقط
  transactionData = await executePendingServiceTasks({
    pending: work.pending,
    processInstance,
    transaction,
    transactionData,
    task,
    userId
  })

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
  runCurrentStageActions,
  prepareServiceTaskWork,
  claimPendingInMemory
}
