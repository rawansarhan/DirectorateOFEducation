'use strict'

const { EmployeeTaskOutputDTO } = require('../dto/EmployeeTaskOutputDTO')
const { TaskDetailsOutputDTO } = require('../dto/TaskDetailsOutputDTO')
const { CompleteTaskOutputDTO } = require('../dto/CompleteTaskOutputDTO')
const { SigningChallengeOutputDTO } = require('../dto/SigningChallengeOutputDTO')
const { StartWorkflowOutputDTO } = require('../dto/StartWorkflowOutputDTO')

function toEmployeeTaskItem ({
  processInstance,
  activeTask,
  userId,
  progressPercent,
  employeeStatus,
  stageNameOverride = null
}) {
  return new EmployeeTaskOutputDTO({
    processInstance,
    activeTask,
    userId,
    progressPercent,
    employeeStatus,
    stageNameOverride
  })
}

function toEmployeeTaskList (pairs = []) {
  return pairs.map(([processInstance, activeTask]) =>
    toEmployeeTaskItem(processInstance, activeTask)
  )
}

function toTaskDetails ({
  task,
  processInstance,
  transaction,
  previousStagesData,
  activeStage = null,
  currentStageConfig = null,
  processDefinition = null,
  assignments = null
}) {
  const resolvedStage = activeStage || processInstance.current_stage
  const resolvedConfig =
    currentStageConfig ??
    processInstance.current_stage?.stage_config?.config_json ??
    {}

  return new TaskDetailsOutputDTO({
    task,
    processInstance,
    transaction,
    previousStagesData,
    activeStage: resolvedStage,
    currentStageConfig: resolvedConfig,
    processDefinition,
    assignments
  })
}

function toCompleteTaskResponse ({
  stage,
  stageSnapshot,
  variables = null,
  signatureRequest = null,
  idempotencyKey = null,
  idempotentReplay = false,
  workflowStatus = 'running',
  templates = []
}) {
  return new CompleteTaskOutputDTO({
    stage,
    stageSnapshot,
    variables,
    signatureRequest,
    idempotencyKey,
    idempotentReplay,
    workflowStatus,
    templates
  })
}

function toSigningChallenge ({
  challenge,
  task,
  transaction,
  stage,
  userKey,
  payloadHash,
  expiresInSeconds
}) {
  return new SigningChallengeOutputDTO({
    challenge,
    task,
    transaction,
    stage,
    userKey,
    payloadHash,
    expiresInSeconds
  })
}

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

function toPublicSignatureRecord (record) {
  if (!record) {
    return null
  }

  const {
    challenge,
    digitalSignature,
    userKey,
    signed_message: signedMessage,
    ...publicRecord
  } = record

  return publicRecord
}

function toDigitalSignatureRecord ({
  document,
  digitalSignature,
  challenge,
  stage,
  userKey
}) {
  return {
    document_id: document.id,
    digital_signature_id: digitalSignature.id,
    signed_hash: digitalSignature.signed_hash,
    previous_signature_hash: digitalSignature.previous_signature_hash,
    signature_order: digitalSignature.signature_order,
    signed_at: digitalSignature.signed_at,
    stage_id: challenge.stage_id,
    stage_code: stage?.code || null,
    task_id: challenge.task_id,
    user_id: challenge.user_id,
    key_fingerprint: userKey.key_fingerprint,
    payload_hash: challenge.payload_hash
  }
}

function toSignatureLedgerEntry ({
  order,
  signature,
  document,
  stageId,
  stageCode
}) {
  return {
    order,
    digital_signature_id: signature.id,
    document_id: document.id,
    stage_id: stageId,
    stage_code: stageCode,
    user_key_id: signature.user_key_id,
    key_fingerprint: signature.user_key?.key_fingerprint || null,
    signed_hash: signature.signed_hash,
    previous_signature_hash: signature.previous_signature_hash,
    payload_hash: signature.signed_hash,
    signed_at: signature.signed_at
  }
}

function toSignatureLedger (transactionId, signatures) {
  return {
    transaction_id: transactionId,
    total_signatures: signatures.length,
    signatures,
    finalized_at: new Date()
  }
}

module.exports = {
  toEmployeeTaskItem,
  toEmployeeTaskList,
  toTaskDetails,
  toCompleteTaskResponse,
  toSigningChallenge,
  toStartWorkflow,
  toPublicSignatureRecord,
  toDigitalSignatureRecord,
  toSignatureLedgerEntry,
  toSignatureLedger
}
