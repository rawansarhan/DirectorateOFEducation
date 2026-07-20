'use strict'

const { loadCompleteTaskContext } = require('./completeTaskContextLoader')
const { resolveDecisionAndValidateComplete } = require('./completeTaskValidation')
const {
  buildStageSnapshot,
  mergeStageSnapshotIntoTransactionData
} = require('./completeTaskSnapshotBuilder')
const { runCurrentStageActions } = require('./completeTaskActionsRunner')
const { completeCamundaTaskWithVariables } = require('./completeTaskCamunda')
const { persistCompleteTaskSideEffects } = require('./completeTaskPersistence')
const { runRejectFlow } = require('./completeTaskRejectFlow')
const { runApproveFlow } = require('./completeTaskApproveFlow')
const { releaseLockAndInvalidateCaches } = require('./completeTaskPostComplete')
const {
  buildCompleteResponse
} = require('./completeTaskHelpers')

/**
 * Core complete-task pipeline (orchestration only).
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

  const { routingValue } = await completeCamundaTaskWithVariables({
    task,
    stage,
    isReject,
    normalizedPayload,
    signingDecision
  })

  const {
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
    task
  })

  const {
    currentVersion: persistedVersion,
    responseTemplates,
    sequelize
  } = await persistCompleteTaskSideEffects({
    signingRequest,
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
