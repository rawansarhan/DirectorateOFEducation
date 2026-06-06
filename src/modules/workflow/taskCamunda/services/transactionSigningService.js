'use strict'

const { v4: uuidv4 } = require('uuid')

const camundaClient = require('../../../../core/shared/clients/camunda/camundaClient')
const transactionClient = require('../../../../core/shared/clients/transaction/transactionClient')
const securityGuardService = require('../../../../core/security/securityGuardService')

const processInstanceRepository = require('../repositories/processInstanceRepository')
const stageRepository = require('../../processDefinition/repositories/stageRepository')
const stageConfigRepository = require('../../stageConfig/repositories/stageConfigRepository')
const userRepository = require('../../../auth/repositories/userRepository')
const userKeyRepository = require('../../../auth/repositories/userKeyRepository')
const { validateSigningChallengePayload } = require('../../schemas/signingChallengeSchema')
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
  verifyPin,
  getTransactionSignExpiresAt,
  TX_SIGN_TTL_MS
} = require('../../../auth/services/cryptoAuthService')
const { assertTaskLockHolder } = require('./taskLockService')
const {
  toSigningChallenge,
  toDigitalSignatureRecord,
  toSignatureLedgerEntry,
  toSignatureLedger
} = require('../mappers/taskCamundaMapper')
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
  decision
}) {
  return {
    taskId: task.id,
    transactionId: transaction.id,
    stageCode: stage.code,
    stageId: stage.id,
    decision
  }
}

async function assertValidPinForSigning ({
  userId,
  pin,
  clientMeta = {},
  taskId
}) {
  const user = await userRepository.findById(userId)

  if (!user || !user.is_active) {
    throw new Error('المستخدم غير موجود أو غير مفعّل')
  }

  if (!user.pin_hash) {
    throw new Error('لم يتم إعداد PIN بعد')
  }

  const pinValid = await verifyPin(pin, user.pin_hash)

  if (!pinValid) {
    const failure = await securityGuardService.recordFailure({
      userId,
      action: 'TX_SIGN_PIN_FAILED',
      resourceType: 'task',
      resourceId: taskId,
      ipAddress: clientMeta.ip,
      userAgent: clientMeta.userAgent,
      details: { message: 'رمز PIN غير صحيح' }
    })

    if (failure.locked) {
      const error = new Error('الحساب مقفل مؤقتاً بسبب محاولات فاشلة متكررة')
      error.code = 'ACCOUNT_LOCKED'
      error.lockedUntil = failure.lockedUntil
      throw error
    }

    const error = new Error('رمز PIN غير صحيح')
    error.remainingAttempts = failure.remainingAttempts
    throw error
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

  const { error: validationError, value: validatedPayload } =
    validateSigningChallengePayload(payload)

  if (validationError) {
    throw new Error(validationError)
  }

  await assertValidPinForSigning({
    userId,
    pin: validatedPayload.pin,
    clientMeta,
    taskId
  })

  const userKey = await userKeyRepository.findActiveLatestByUserId(userId)

  if (!userKey) {
    throw new Error('لا يوجد مفتاح رقمي مرتبط بهذا الموظف')
  }

  const signingPayload = buildSigningPayload({
    task: context.task,
    transaction: context.transaction,
    stage: context.stage,
    decision: validatedPayload.decision
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
      stageCode: context.stage.code,
      decision: validatedPayload.decision
    }
  })

  return toSigningChallenge({
    challenge,
    task: context.task,
    transaction: context.transaction,
    stage: context.stage,
    userKey,
    payloadHash,
    expiresInSeconds: Math.floor(TX_SIGN_TTL_MS / 1000)
  })
}
async function assertSigningChallengeReady ({
  challenge,
  userId,
  decision
}) {
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

  if (!decision) {
    throw new Error('decision is required to verify signing challenge')
  }

  const stage = await stageRepository.findById(challenge.stage_id)
  const signedPayload = buildSigningPayload({
    task: { id: challenge.task_id },
    transaction: { id: challenge.transaction_id },
    stage: { code: stage?.code, id: challenge.stage_id },
    decision
  })
  const requestPayloadHash = buildCanonicalPayloadHash(signedPayload)

  if (requestPayloadHash !== challenge.payload_hash) {
    throw new Error('decision does not match the signed signing challenge')
  }

  return { stage, requestPayloadHash }
}

/**
 * تحقق فقط — بدون حفظ في DB (يُستدعى قبل Camunda).
 */
async function verifySignatureForComplete ({
  challengeId,
  signature,
  userId,
  decision = null,
  clientMeta = {}
}) {
  await securityGuardService.assertAccountNotLocked(userId)

  const challenge =
    await transactionSigningChallengeRepository.findById(challengeId)

  const { stage } = await assertSigningChallengeReady({
    challenge,
    userId,
    decision
  })

  const userKey = await userKeyRepository.findById(challenge.user_key_id)

  if (!userKey || !userKey.is_active) {
    throw new Error('Digital key is not active')
  }

  const signatureValid = verifyChallengeSignature({
    publicKeyPem: userKey.public_key,
    message: challenge.message,
    signatureBase64: signature
  })

  if (!signatureValid) {
    const failure = await securityGuardService.recordFailure({
      userId,
      action: 'TX_SIGN_VERIFY_FAILED',
      resourceType: 'task',
      resourceId: challenge.task_id,
      ipAddress: clientMeta.ip,
      userAgent: clientMeta.userAgent,
      details: { challengeId }
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

  return {
    challenge,
    userKey,
    stage
  }
}

/**
 * حفظ التوقيع بعد نجاح Camunda — ضمن transaction DB واحدة.
 */
async function persistVerifiedSignature ({
  challengeId,
  signature,
  userId,
  clientMeta = {}
}) {
  await securityGuardService.assertAccountNotLocked(userId)

  const sequelize = transactionSigningChallengeRepository.getSequelize()
  const transaction = await sequelize.transaction()

  try {
    const challenge = await transactionSigningChallengeRepository.findByIdWithLock(
      challengeId,
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

    const stage = await stageRepository.findById(challenge.stage_id)

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

    await securityGuardService.recordSuccess({
      userId,
      action: 'TX_SIGN_VERIFIED',
      resourceType: 'task',
      resourceId: challenge.task_id,
      ipAddress: clientMeta.ip,
      userAgent: clientMeta.userAgent,
      details: {
        signingId: challengeId,
        digitalSignatureId: digitalSignature.id,
        documentId: document.id,
        stageCode: stage?.code
      }
    })

    return toDigitalSignatureRecord({
      document,
      digitalSignature,
      challenge,
      stage,
      userKey
    })
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback()
    }

    throw error
  }
}

async function verifyAndPersistSignature (params) {
  const verified = await verifySignatureForComplete(params)

  return persistVerifiedSignature({
    challengeId: params.challengeId,
    signature: params.signature,
    userId: params.userId,
    clientMeta: params.clientMeta
  })
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

      signatures.push(toSignatureLedgerEntry({
        order,
        signature,
        document,
        stageId,
        stageCode: stageId ? stageCodeById.get(stageId) || null : null
      }))
    }
  }

  return toSignatureLedger(transactionId, signatures)
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
  verifySignatureForComplete,
  persistVerifiedSignature,
  verifyAndPersistSignature,
  buildTransactionSignatureLedger,
  appendSignatureToTransactionData
}
