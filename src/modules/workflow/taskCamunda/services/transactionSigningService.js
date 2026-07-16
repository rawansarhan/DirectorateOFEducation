'use strict'

const { v4: uuidv4 } = require('uuid')

const camundaClient = require('../../../../core/shared/clients/camunda/camundaClient')
const transactionClient = require('../../../../core/shared/clients/transaction/transactionClient')
const securityGuardService = require('../../../../core/security/securityGuardService')

const processInstanceRepository = require('../repositories/processInstanceRepository')
const processRepository = require('../../processDefinition/repositories/processRepository')
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
const { findOrCreateTypeDocByName } = require('../../../requirements/typeDoc/services/typeDocService')
const { DIGITAL_SIGNED_DOCUMENT_TYPE } = require('../../../requirements/typeDoc/constants/typeDocDefaults')

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

/**
 * توقيع USB إلزامي لكل USER_TASK / APPROVAL / UPLOAD (ما عدا auto-complete).
 * يُتجاهل requires_digital_signature في stageConfig — لا يُسمح بالمرور بدون توقيع.
 */
function requiresDigitalSignature (
  stage,
  payload = {},
  stageConfig = null,
  { isAutoComplete = false } = {}
) {
  if (isAutoComplete) {
    return false
  }

  if (!stage || !USER_TASK_TYPES.includes(stage.type)) {
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

const DRAFT_SUBMIT_TASK_PREFIX = 'draft-submit'

function buildDraftSubmitTaskId (transactionId) {
  return `${DRAFT_SUBMIT_TASK_PREFIX}:${transactionId}`
}

function isDraftSubmitTaskId (taskId) {
  return String(taskId || '').startsWith(`${DRAFT_SUBMIT_TASK_PREFIX}:`)
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
  clientMeta = {},
  forceSignature = false
}) {
  await securityGuardService.assertAccountNotLocked(userId)

  const context = await loadTaskContext(taskId)

  await assertTaskLockHolder({
    processInstanceId: context.processInstance.id,
    taskId: context.task.id,
    userId
  })

  // USER_TASK + تقديم الموظف: التوقيع دائماً مطلوب (يُتجاهل requires_digital_signature: false)
  if (
    !forceSignature &&
    !requiresDigitalSignature(context.stage, payload, context.stageConfig)
  ) {
    const error = new Error('التوقيع الرقمي غير مطلوب لهذه المرحلة')
    error.code = 'SIGNATURE_NOT_REQUIRED'
    throw error
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

async function createDraftSubmitSigningChallenge ({
  transactionId,
  userId,
  payload = {},
  clientMeta = {}
}) {
  await securityGuardService.assertAccountNotLocked(userId)

  const numericTransactionId = Number(transactionId)

  if (!Number.isInteger(numericTransactionId) || numericTransactionId < 1) {
    throw new Error('معرّف المعاملة غير صالح')
  }

  const transaction = await transactionClient.getTransactionById(numericTransactionId)

  if (!transaction) {
    const error = new Error('المعاملة غير موجودة')
    error.code = 'TRANSACTION_NOT_FOUND'
    throw error
  }

  if (userId && transaction.user_id !== userId) {
    const error = new Error('لا تملك صلاحية الوصول إلى هذه المعاملة')
    error.code = 'UNAUTHORIZED'
    throw error
  }

  if (transaction.status !== 'draft') {
    const error = new Error(
      'تحدي التوقيع للمسودة متاح فقط عندما تكون المعاملة draft'
    )
    error.code = 'SUBMIT_NOT_DRAFT'
    throw error
  }

  const process = await processRepository.findByCode(transaction.code)

  if (!process) {
    throw new Error('العملية المرتبطة بالمعاملة غير موجودة')
  }

  const stage = await stageRepository.findFirstAuthStage(process.id)

  if (!stage) {
    throw new Error('لا توجد مرحلة AUTH لهذه العملية')
  }

  const pin = payload.pin

  if (!pin) {
    throw new Error('رمز PIN مطلوب')
  }

  const syntheticTaskId = buildDraftSubmitTaskId(numericTransactionId)

  await assertValidPinForSigning({
    userId,
    pin,
    clientMeta,
    taskId: syntheticTaskId
  })

  const userKey = await userKeyRepository.findActiveLatestByUserId(userId)

  if (!userKey) {
    throw new Error('لا يوجد مفتاح رقمي مرتبط بهذا الموظف')
  }

  const signingPayload = buildSigningPayload({
    task: { id: syntheticTaskId },
    transaction,
    stage,
    decision: 'approve'
  })

  const payloadHash = buildCanonicalPayloadHash(signingPayload)

  await transactionSigningChallengeRepository.invalidateActiveByTaskAndUser(
    syntheticTaskId,
    userId
  )

  const signingId = uuidv4()
  const expiresAt = getTransactionSignExpiresAt()
  const message = buildTransactionSignMessage({
    signingId,
    taskId: syntheticTaskId,
    transactionId: transaction.id,
    stageCode: stage.code,
    payloadHash,
    expiresAt,
    userId,
    keyFingerprint: userKey.key_fingerprint
  })

  const challenge = await transactionSigningChallengeRepository.create({
    id: signingId,
    user_id: userId,
    user_key_id: userKey.id,
    task_id: syntheticTaskId,
    transaction_id: transaction.id,
    stage_id: stage.id,
    payload_hash: payloadHash,
    message,
    message_hash: hashValue(message),
    expires_at: expiresAt
  })

  await securityGuardService.recordSuccess({
    userId,
    action: 'TX_SIGN_CHALLENGE_CREATED',
    resourceType: 'transaction',
    resourceId: String(transaction.id),
    ipAddress: clientMeta.ip,
    userAgent: clientMeta.userAgent,
    details: {
      signingId: challenge.id,
      transactionId: transaction.id,
      stageCode: stage.code,
      decision: 'approve',
      draft_submit: true
    }
  })

  return toSigningChallenge({
    challenge,
    task: { id: syntheticTaskId },
    transaction,
    stage,
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
  clientMeta = {},
  expectedTaskId = null
}) {
  await securityGuardService.assertAccountNotLocked(userId)

  const challenge =
    await transactionSigningChallengeRepository.findById(challengeId)

  const { stage } = await assertSigningChallengeReady({
    challenge,
    userId,
    decision
  })

  if (
    expectedTaskId &&
    String(challenge.task_id) !== String(expectedTaskId)
  ) {
    const error = new Error(
      [
        `challenge_id مرتبط بمهمة مختلفة (${challenge.task_id}) عن taskId في URL (${expectedTaskId}).`,
        'أعد GET /api/workflow/tasks ثم POST /tasks/{taskId}/signing-challenge على taskId الحالي قبل complete.'
      ].join(' ')
    )
    error.code = 'SIGNING_CHALLENGE_TASK_MISMATCH'
    error.statusCode = 400
    error.expose = true
    error.details = {
      challenge_task_id: challenge.task_id,
      url_task_id: String(expectedTaskId),
      failure_stage: 'signature_verification',
      next_steps: [
        'GET /api/workflow/tasks/pending-pickup أو /in-progress',
        `POST /api/workflow/tasks/${expectedTaskId}/signing-challenge`,
        `POST /api/workflow/tasks/${expectedTaskId}/complete`
      ]
    }
    throw error
  }

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
  clientMeta = {},
  dbTransaction = null
}) {
  await securityGuardService.assertAccountNotLocked(userId)

  const sequelize = transactionSigningChallengeRepository.getSequelize()
  const ownsTransaction = !dbTransaction
  const transaction = dbTransaction || await sequelize.transaction()

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
    const signedTypeDoc = await findOrCreateTypeDocByName(DIGITAL_SIGNED_DOCUMENT_TYPE)

    const document = await documentSignatureRepository.create({
      transaction_id: challenge.transaction_id,
      file_path: `transaction://${challenge.transaction_id}/stage/${challenge.stage_id}`,
      type_doc_id: signedTypeDoc.id
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

    if (ownsTransaction) {
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
    }

    return toDigitalSignatureRecord({
      document,
      digitalSignature,
      challenge,
      stage,
      userKey
    })
  } catch (error) {
    if (ownsTransaction && !transaction.finished) {
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
  buildDraftSubmitTaskId,
  isDraftSubmitTaskId,
  createSigningChallenge,
  createDraftSubmitSigningChallenge,
  verifySignatureForComplete,
  persistVerifiedSignature,
  verifyAndPersistSignature,
  buildTransactionSignatureLedger,
  appendSignatureToTransactionData
}
