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

/**
 * Core complete-task pipeline (orchestration only).
 *
 * الترتيب:
 * 1) توقيع + بيانات المرحلة في DB
 * 2) completeCamunda آخراً لمسار USER_TASK
 * 3) SERVICE_TASK (GENERATE_PDF…) بعد Camunda ثم حفظ نتائجها
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

  // دمج بيانات المرحلة فقط — بدون SERVICE_TASK قبل Camunda
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

  // حفظ الداتا قبل Camunda — إن فشل يبقى الـ task نشطاً
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

  // آخر خطوة لمسار USER_TASK: إكمال Camunda
  const { routingValue } = await completeCamundaTaskWithVariables({
    task,
    stage,
    isReject,
    normalizedPayload,
    signingDecision
  })

  // بعد Camunda: SERVICE_TASK المكتملة (مثل GENERATE_PDF)
  if (!isReject) {
    const beforeServiceTasks = JSON.stringify(
      transactionData._executedServiceTasks || []
    )

    transactionData = await runServiceTaskActions({
      processInstance,
      transaction,
      transactionData,
      task,
      userId
    })

    const afterServiceTasks = JSON.stringify(
      transactionData._executedServiceTasks || []
    )

    if (beforeServiceTasks !== afterServiceTasks) {
      logStep('PHASE_12_PERSIST_SERVICE_TASK_RESULTS', {
        transactionId: transaction.id,
        version: currentVersion
      })

      const updated = await transactionRepository.updateDataOptimistic(
        transaction.id,
        transactionData,
        currentVersion,
        dbTransaction
      )
      currentVersion = updated.version
    }
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
}

module.exports = {
  completeTaskCore
}
