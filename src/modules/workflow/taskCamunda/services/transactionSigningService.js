'use strict'

const { v4: uuidv4 } = require('uuid')

const camundaClient = require('../../../../core/shared/clients/camunda/camundaClient')
const transactionClient = require('../../../../core/shared/clients/transaction/transactionClient')
const securityGuardService = require('../../../../core/security/securityGuardService')

const processInstanceRepository = require('../repositories/processInstanceRepository')
const stageRepository = require('../../repositories/stageRepository')
const stageConfigRepository = require('../../repositories/stageConfigRepository')
const userKeyRepository = require('../../../auth/repositories/userKeyRepository')
const transactionSigningChallengeRepository =
  require('../repositories/transactionSigningChallengeRepository')
const documentSignatureRepository =
  require('../repositories/documentSignatureRepository')
const digitalSignatureRepository =
  require('../repositories/digitalSignatureRepository')

const {
  buildTransactionSignMessage,
  buildCanonicalPayloadHash,
  hashValue,
  verifyChallengeSignature,
  getTransactionSignExpiresAt,
  TX_SIGN_TTL_MS
} = require('../../../auth/services/cryptoAuthService')
const { assertTaskLockHolder } = require('./taskLockService')
/////////////////////////////////////////////////////////////
async function loadTaskContext (taskId) {
  const task = await camundaClient.getTaskById(taskId)

  if (!task) {
    throw new Error('Task not found')
  }

  const processInstance = await processInstanceRepository.findByCamundaId(
    task.processInstanceId
  )

  if (!processInstance) {
    throw new Error('Process instance not found')
  }

  const transaction = await transactionClient.getTransactionById(
    processInstance.transaction_id
  )

  if (!transaction) {
    throw new Error('Transaction not found')
  }

  const stage = await stageRepository.findByCodeAndProcess(
    processInstance.process_definition_id,
    task.taskDefinitionKey
  )

  if (!stage) {
    throw new Error('Stage not found')
  }

  const stageConfig = await stageConfigRepository.findByStageId(stage.id)

  return {
    task,
    processInstance,
    transaction,
    stage,
    stageConfig
  }
}
///////////////////////////////////////////////////////////////////////
const USER_TASK_TYPES = ['USER_TASK', 'APPROVAL', 'UPLOAD']

function requiresDigitalSignature (
  stage,
  payload = {},
  stageConfig = null,
  { isAutoComplete = false } = {}
) {
  if (isAutoComplete) {
    return false
  }

  if (!USER_TASK_TYPES.includes(stage.type)) {
    return false
  }

  const config = stageConfig?.config_json || {}

  if (config.requires_digital_signature === false) {
    return false
  }

  return true
}

function buildSigningPayload ({
  task,
  transaction,
  stage,
  payload
}) {
  return {
    taskId: task.id,
    transactionId: transaction.id,
    stageCode: stage.code,
    stageId: stage.id,
    variables: payload.variables || {},
    fields: payload.fields || [],
    files: payload.files || []
  }
}

async function createSigningChallenge ({
  taskId,
  userId,
  payload = {},
  clientMeta = {}
}) {
  await securityGuardService.assertAccountNotLocked(userId)

  const context = await loadTaskContext(taskId)

  await assertTaskLockHolder({
    processInstanceId: context.processInstance.id,
    taskId: context.task.id,
    userId
  })

  if (!requiresDigitalSignature(context.stage, payload, context.stageConfig)) {
    throw new Error('Digital signature is not required for this task')
  }

  const userKey = await userKeyRepository.findActiveLatestByUserId(userId)

  if (!userKey) {
    throw new Error('لا يوجد مفتاح رقمي مرتبط بهذا الموظف')
  }

  const signingPayload = buildSigningPayload({
    task: context.task,
    transaction: context.transaction,
    stage: context.stage,
    payload
  })

  const payloadHash = buildCanonicalPayloadHash(signingPayload)

  await transactionSigningChallengeRepository.invalidateActiveByTaskAndUser(
    taskId,
    userId
  )

  const signingId = uuidv4()
  const expiresAt = getTransactionSignExpiresAt()
  const message = buildTransactionSignMessage({
    signingId,
    taskId: context.task.id,
    transactionId: context.transaction.id,
    stageCode: context.stage.code,
    payloadHash,
    expiresAt,
    userId,
    keyFingerprint: userKey.key_fingerprint
  })

  const challenge = await transactionSigningChallengeRepository.create({
    id: signingId,
    user_id: userId,
    user_key_id: userKey.id,
    task_id: context.task.id,
    transaction_id: context.transaction.id,
    stage_id: context.stage.id,
    payload_hash: payloadHash,
    message,
    message_hash: hashValue(message),
    expires_at: expiresAt
  })

  await securityGuardService.recordSuccess({
    userId,
    action: 'TX_SIGN_CHALLENGE_CREATED',
    resourceType: 'task',
    resourceId: taskId,
    ipAddress: clientMeta.ip,
    userAgent: clientMeta.userAgent,
    details: {
      signingId: challenge.id,
      transactionId: context.transaction.id,
      stageCode: context.stage.code
    }
  })

  return {
    signing_id: challenge.id,
    task_id: context.task.id,
    transaction_id: context.transaction.id,
    stage_code: context.stage.code,
    key_fingerprint: userKey.key_fingerprint,
    message: challenge.message,
    payload_hash: payloadHash,
    expires_at: challenge.expires_at,
    expires_in_seconds: Math.floor(TX_SIGN_TTL_MS / 1000)
  }
}
////////////////////////////////////////////////////////////
async function verifyAndPersistSignature ({
  signingId,
  signature,
  userId,
  clientMeta = {}
}) {
  await securityGuardService.assertAccountNotLocked(userId)

  const sequelize = transactionSigningChallengeRepository.getSequelize()
  const transaction = await sequelize.transaction()

  try {
    const challenge = await transactionSigningChallengeRepository.findByIdWithLock(
      signingId,
      transaction
    )

    if (!challenge) {
      throw new Error('Signing challenge not found')
    }

    if (challenge.user_id !== userId) {
      throw new Error('Signing challenge does not belong to this user')
    }

    if (challenge.used_at) {
      throw new Error('Signing challenge already used (replay attack)')
    }

    if (new Date() > challenge.expires_at) {
      throw new Error('Signing challenge expired')
    }

    const userKey = await userKeyRepository.findById(challenge.user_key_id, {
      transaction
    })

    if (!userKey || !userKey.is_active) {
      throw new Error('Digital key is not active')
    }

    const signatureValid = verifyChallengeSignature({
      publicKeyPem: userKey.public_key,
      message: challenge.message,
      signatureBase64: signature
    })

    if (!signatureValid) {
      await transaction.rollback()

      const failure = await securityGuardService.recordFailure({
        userId,
        action: 'TX_SIGN_VERIFY_FAILED',
        resourceType: 'task',
        resourceId: challenge.task_id,
        ipAddress: clientMeta.ip,
        userAgent: clientMeta.userAgent,
        details: { signingId }
      })

      if (failure.locked) {
        const error = new Error('الحساب مقفل مؤقتاً بسبب محاولات فاشلة متكررة')
        error.code = 'ACCOUNT_LOCKED'
        error.lockedUntil = failure.lockedUntil
        throw error
      }

      const error = new Error('Invalid digital signature')
      error.remainingAttempts = failure.remainingAttempts
      throw error
    }

    const document = await documentSignatureRepository.create({
      transaction_id: challenge.transaction_id,
      file_path: `transaction://${challenge.transaction_id}/stage/${challenge.stage_id}`,
      file_hash: challenge.payload_hash,
      file_type: 'signed'
    }, { transaction })

    const previousSignature =
      await digitalSignatureRepository.findLatestByTransactionId(
        challenge.transaction_id
      )

    const globalSignatureOrder =
      (await digitalSignatureRepository.countByTransactionId(challenge.transaction_id)) + 1

    const digitalSignature = await digitalSignatureRepository.create({
      document_id: document.id,
      user_key_id: userKey.id,
      signature_order: globalSignatureOrder,
      previous_signature_hash: previousSignature?.signed_hash || null,
      signed_hash: challenge.message_hash,
      signature_value: signature,
      signed_at: new Date()
    }, { transaction })

    await transactionSigningChallengeRepository.markUsed(challenge, transaction)

    await transaction.commit()

    const stage = await stageRepository.findById(challenge.stage_id)

    await securityGuardService.recordSuccess({
      userId,
      action: 'TX_SIGN_VERIFIED',
      resourceType: 'task',
      resourceId: challenge.task_id,
      ipAddress: clientMeta.ip,
      userAgent: clientMeta.userAgent,
      details: {
        signingId,
        digitalSignatureId: digitalSignature.id,
        documentId: document.id,
        stageCode: stage?.code
      }
    })

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
      user_id: userId,
      key_fingerprint: userKey.key_fingerprint,
      payload_hash: challenge.payload_hash
    }
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback()
    }

    throw error
  }
}

function parseStageIdFromDocumentPath (filePath) {
  const match = String(filePath || '').match(/\/stage\/(\d+)/)
  return match ? Number(match[1]) : null
}

async function buildTransactionSignatureLedger (transactionId) {
  const documents =
    await documentSignatureRepository.findAllWithSignaturesByTransactionId(
      transactionId
    )

  const stageIds = documents
    .map(doc => parseStageIdFromDocumentPath(doc.file_path))
    .filter(Boolean)

  const stages = stageIds.length
    ? await stageRepository.findByIds([...new Set(stageIds)])
    : []

  const stageCodeById = new Map(stages.map(stage => [stage.id, stage.code]))

  const signatures = []
  let order = 0

  for (const document of documents) {
    const stageId = parseStageIdFromDocumentPath(document.file_path)

    for (const signature of document.signatures || []) {
      order += 1

      signatures.push({
        order,
        digital_signature_id: signature.id,
        document_id: document.id,
        stage_id: stageId,
        stage_code: stageId ? stageCodeById.get(stageId) || null : null,
        user_key_id: signature.user_key_id,
        key_fingerprint: signature.user_key?.key_fingerprint || null,
        signed_hash: signature.signed_hash,
        previous_signature_hash: signature.previous_signature_hash,
        payload_hash: document.file_hash,
        signed_at: signature.signed_at
      })
    }
  }

  return {
    transaction_id: transactionId,
    total_signatures: signatures.length,
    signatures,
    finalized_at: new Date()
  }
}

function appendSignatureToTransactionData (
  transactionData,
  digitalSignatureRecord
) {
  const ledger = Array.isArray(transactionData._digital_signatures)
    ? transactionData._digital_signatures
    : []

  ledger.push({
    ...digitalSignatureRecord,
    recorded_at: new Date()
  })

  transactionData._digital_signatures = ledger

  return transactionData
}

module.exports = {
  loadTaskContext,
  requiresDigitalSignature,
  createSigningChallenge,
  verifyAndPersistSignature,
  buildTransactionSignatureLedger,
  appendSignatureToTransactionData
}
