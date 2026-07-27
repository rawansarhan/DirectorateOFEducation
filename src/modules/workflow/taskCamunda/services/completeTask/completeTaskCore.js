'use strict'

const { loadCompleteTaskContext } = require('./completeTaskContextLoader')
const { resolveDecisionAndValidateComplete } = require('./completeTaskValidation')
const {
  buildStageSnapshot,
  mergeStageSnapshotIntoTransactionData
} = require('./completeTaskSnapshotBuilder')
const {
  runCurrentStageActions,
  runServiceTaskActions
} = require('./completeTaskActionsRunner')
const { completeCamundaTaskWithVariables } = require('./completeTaskCamunda')
const { persistCompleteTaskSideEffects } = require('./completeTaskPersistence')
const { runRejectFlow } = require('./completeTaskRejectFlow')
const { runApproveFlow } = require('./completeTaskApproveFlow')
const { releaseLockAndInvalidateCaches } = require('./completeTaskPostComplete')
const {
  buildCompleteResponse,
  logStep
} = require('./completeTaskHelpers')
const {
  persistVerifiedSignature,
  appendSignatureToTransactionData
} = require('../transactionSigningService')
const { toPublicSignatureRecord } = require('../../mappers/completeTaskMapper')
const {
  transactionRepository
} = require('../../../../transaction/public')
const {
  initCompleteSideEffects,
  attachCompleteSideEffects,
  markCompleteSideEffectStep,
  markCompleteSideEffectsDone,
  markCompleteSideEffectsFailed
} = require('./completeSideEffectsState')

async function persistCompleteCheckpoint ({
  transactionId,
  transactionData,
  sideEffects,
  expectedVersion,
  dbTransaction = null
}) {
  const payload = attachCompleteSideEffects(transactionData, sideEffects)
  const updated = await transactionRepository.updateDataOptimistic(
    transactionId,
    payload,
    expectedVersion,
    dbTransaction
  )

  return {
    version: updated.version,
    transactionData: updated.data || payload
  }
}

/**
 * Core complete-task pipeline (orchestration only).
 *
 * Forward recovery:
 * - local_saved → camunda_done → service_tasks_done → workflow_synced → lock_released
 * - عند الفشل بعد Camunda يُحفظ _complete_side_effects ويُستأنف عبر completeRecoveryService
 */
async function completeTaskCore ({
  taskId,
  userId,
  payload,
  clientMeta = {},
  isAutoComplete = false,
  idempotencyKey = null,
  acquireOperationGuard = null,
  requireSignature = false,
  issuedIdempotencyKey = null,
  dbTransaction = null
}) {
  const {
    task,
    processInstance,
    transaction,
    stage,
    currentVersion: initialVersion
  } = await loadCompleteTaskContext({
    taskId,
    userId,
    payload,
    isAutoComplete,
    dbTransaction
  })

  let currentVersion = initialVersion

  const {
    signingDecision,
    isReject,
    stageConfig,
    normalizedPayload,
    overrideTarget,
    signingRequest
  } = await resolveDecisionAndValidateComplete({
    payload,
    stage,
    transaction,
    task,
    userId,
    clientMeta,
    isAutoComplete,
    requireSignature,
    idempotencyKey,
    acquireOperationGuard
  })

  let sideEffects = initCompleteSideEffects({
    taskId: task.id,
    stageCode: stage.code,
    userId,
    isReject,
    isAutoComplete,
    overrideTarget
  })

  const stageSnapshot = await buildStageSnapshot({
    payload,
    normalizedPayload,
    signingDecision,
    stage,
    stageConfig,
    transaction,
    userId,
    isAutoComplete,
    isReject,
    overrideTarget
  })

  await runCurrentStageActions({
    payload,
    stage,
    stageConfig,
    task,
    transaction,
    processInstance,
    userId
  })

  let digitalSignatureRecord = null

  if (signingRequest) {
    logStep('PHASE_10_PERSIST_SIGNATURE_BEFORE_DATA', {
      challengeId: signingRequest.challengeId
    })

    digitalSignatureRecord = await persistVerifiedSignature({
      challengeId: signingRequest.challengeId,
      signature: signingRequest.signature,
      userId,
      clientMeta,
      dbTransaction
    })

    stageSnapshot.digital_signature =
      toPublicSignatureRecord(digitalSignatureRecord)

    logStep('SIGNATURE_PERSISTED', {
      digitalSignatureId: digitalSignatureRecord.digital_signature_id
    })
  }

  let {
    transactionData,
    persistAuthSubmissionAtRoot
  } = await mergeStageSnapshotIntoTransactionData({
    transaction,
    stage,
    stageSnapshot,
    userId,
    isAutoComplete,
    isReject,
    processInstance,
    task,
    skipServiceTasks: true
  })

  if (digitalSignatureRecord) {
    appendSignatureToTransactionData(transactionData, digitalSignatureRecord)
  }

  sideEffects = markCompleteSideEffectStep(sideEffects, 'local_saved')
  transactionData = attachCompleteSideEffects(transactionData, sideEffects)

  logStep('PHASE_11_PERSIST_DATA_BEFORE_CAMUNDA', {
    transactionId: transaction.id,
    version: currentVersion
  })

  const {
    currentVersion: persistedVersion,
    responseTemplates,
    sequelize
  } = await persistCompleteTaskSideEffects({
    signingRequest,
    digitalSignatureRecord,
    clientMeta,
    userId,
    task,
    stage,
    transaction,
    transactionData,
    currentVersion,
    persistAuthSubmissionAtRoot,
    isReject,
    stageSnapshot,
    dbTransaction
  })

  currentVersion = persistedVersion
  transactionData = attachCompleteSideEffects(transactionData, sideEffects)

  try {
    const { routingValue } = await completeCamundaTaskWithVariables({
      task,
      stage,
      isReject,
      normalizedPayload,
      signingDecision
    })

    sideEffects = markCompleteSideEffectStep(sideEffects, 'camunda_done')
    transactionData = attachCompleteSideEffects(transactionData, sideEffects)

    const checkpoint = await persistCompleteCheckpoint({
      transactionId: transaction.id,
      transactionData,
      sideEffects,
      expectedVersion: currentVersion,
      dbTransaction
    })

    currentVersion = checkpoint.version
    transactionData = checkpoint.transactionData

    if (!isReject) {
    transactionData = await runServiceTaskActions({
      processInstance,
      transaction,
      transactionData,
      task,
      userId,
      source: 'complete'
    })

      sideEffects = markCompleteSideEffectStep(sideEffects, 'service_tasks_done')
      transactionData = attachCompleteSideEffects(transactionData, sideEffects)

      const saved = await persistCompleteCheckpoint({
        transactionId: transaction.id,
        transactionData,
        sideEffects,
        expectedVersion: currentVersion,
        dbTransaction
      })

      currentVersion = saved.version
      transactionData = saved.transactionData
    } else {
      sideEffects = markCompleteSideEffectStep(sideEffects, 'service_tasks_done')
      transactionData = attachCompleteSideEffects(transactionData, sideEffects)
    }

    let workflowStatus = 'running'
    let nextStageId = null
    let latestTransactionData = transactionData

    if (isReject) {
      const rejectResult = await runRejectFlow({
        processInstance,
        transaction,
        transactionData: latestTransactionData,
        currentVersion,
        stage,
        stageSnapshot,
        userId,
        sequelize,
        dbTransaction
      })

      workflowStatus = rejectResult.workflowStatus
      nextStageId = rejectResult.nextStageId
      currentVersion = rejectResult.currentVersion
      latestTransactionData = rejectResult.transactionData
    } else {
      const approveResult = await runApproveFlow({
        processInstance,
        transaction,
        transactionData: latestTransactionData,
        currentVersion,
        overrideTarget,
        userId,
        sequelize,
        dbTransaction
      })

      workflowStatus = approveResult.workflowStatus
      nextStageId = approveResult.nextStageId
      currentVersion = approveResult.currentVersion
      latestTransactionData = approveResult.transactionData
    }

    sideEffects = markCompleteSideEffectStep(sideEffects, 'workflow_synced', {
      workflow_status: workflowStatus,
      next_stage_id: nextStageId
    })
    latestTransactionData = attachCompleteSideEffects(
      latestTransactionData,
      sideEffects
    )

    const synced = await persistCompleteCheckpoint({
      transactionId: transaction.id,
      transactionData: latestTransactionData,
      sideEffects,
      expectedVersion: currentVersion,
      dbTransaction
    })

    currentVersion = synced.version
    latestTransactionData = synced.transactionData

    await releaseLockAndInvalidateCaches({
      isAutoComplete,
      processInstance,
      task,
      userId,
      stage,
      nextStageId,
      workflowStatus,
      isReject
    })

    sideEffects = markCompleteSideEffectsDone(sideEffects, {
      workflow_status: workflowStatus,
      next_stage_id: nextStageId
    })
    latestTransactionData = attachCompleteSideEffects(
      latestTransactionData,
      sideEffects
    )

    await persistCompleteCheckpoint({
      transactionId: transaction.id,
      transactionData: latestTransactionData,
      sideEffects,
      expectedVersion: currentVersion,
      dbTransaction
    })

    return buildCompleteResponse({
      stage,
      stageSnapshot,
      variables: routingValue ? { value: routingValue } : null,
      signingRequest,
      idempotencyKey: issuedIdempotencyKey,
      idempotentReplay: false,
      workflowStatus,
      templates: responseTemplates
    })
  } catch (err) {
    sideEffects = markCompleteSideEffectsFailed(sideEffects, err)
    transactionData = attachCompleteSideEffects(transactionData, sideEffects)

    if (sideEffects.camunda_done) {
      try {
        await persistCompleteCheckpoint({
          transactionId: transaction.id,
          transactionData,
          sideEffects,
          expectedVersion: currentVersion,
          dbTransaction
        })

        logStep('COMPLETE_CHECKPOINT_SAVED_FOR_RECOVERY', {
          transactionId: transaction.id,
          taskId: task.id
        })
      } catch (persistErr) {
        console.error(
          '[CompleteTask] failed to persist recovery checkpoint:',
          persistErr.message
        )
      }
    }

    throw err
  }
}

module.exports = {
  completeTaskCore,
  persistCompleteCheckpoint
}
