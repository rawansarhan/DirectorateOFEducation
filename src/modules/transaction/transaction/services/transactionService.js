'use strict'

const repo = require('../repositories/transactionRepository')
const { toDTO } = require('../mappers/transactionMapper')
const { TransactionIdentityInputDTO } = require('../dto/TransactionDraftInputDTO')
const {
  parsePositiveInt,
  validateIdentityBody,
  validateIdentityCompleteForSubmit,
  IDENTITY_KEYS
} = require('../validations/transactionValidations')
const {
  validateUpsertDraftBody,
  validateDraftFormAgainstConfig,
  hasUpsertFormPayload
} = require('../validations/draftFormValidation')
const {
  createTransactionError,
  MESSAGES
} = require('../utils/transactionErrors')
const { retryWithBackoff } = require('../../../../core/utils/retryWithBackoff')
const {
  registerTransactionFiles
} = require('../../document/services/documentFileService')
const workflowClient = require('../../../../core/shared/clients/workflow/workflowClient')
const { startWorkflow } = require('../../../workflow/taskCamunda/services/startWorkflowService')
const db = require('../../../../entities')
const { formatClientErrorMessage } = require('../../../../core/utils/errorMessageHelper')

const { v4: uuidv4 } = require('uuid')

const {
  validateSubmitTransactionRequest,
  buildStoredSubmissionData,
  loadAuthStageByProcessCode,
  loadAuthStageConfigByProcessCode
} = require('../../../workflow/services/stageSubmissionService')

const operationGuardService = require('../../../../core/security/operationGuardService')
const employeeTaskRepository = require('../../../workflow/taskCamunda/repositories/employeeTaskRepository')
const userRepository = require('../../../auth/repositories/userRepository')
const {
  verifySignatureForComplete,
  persistVerifiedSignature,
  buildDraftSubmitTaskId
} = require('../../../workflow/taskCamunda/services/transactionSigningService')

const SUBMIT_IDEMPOTENCY_SCOPE = 'submit_transaction'

function buildSubmitGuardKey (transactionId) {
  return `txn-${transactionId}`
}

async function userRequiresSubmitSignature (userId) {
  if (!userId) {
    return false
  }

  const roleIds = await employeeTaskRepository.getUserRoleIds(userId)
  return roleIds.length > 0
}

function extractSubmitSignature (payload = {}) {
  const signature = payload?.signature

  if (!signature) {
    return null
  }

  const challengeId = signature.challenge_id || signature.signing_id
  const signatureValue = signature.signature

  if (!challengeId || !signatureValue) {
    return null
  }

  return {
    challengeId,
    signature: signatureValue
  }
}

function wrapSubmitResult (dto, idempotencyKey, idempotentReplay = false, extra = {}) {
  return {
    ...dto,
    ...extra,
    idempotency_key: idempotencyKey,
    idempotent_replay: Boolean(idempotentReplay)
  }
}

const { ensureGenesisHash } =
  require('../../integrityChain/services/integrityChainService')
const { ensureTransactionIdProcess } =
  require('../services/transactionIdProcessService')

async function fetchActiveProcess (processId) {
  const numericProcessId = parsePositiveInt(processId, 'معرّف العملية')
  const process = await workflowClient.getProcessById(numericProcessId)

  if (!process) {
    throw createTransactionError('PROCESS_NOT_FOUND')
  }

  if (!process.is_active) {
    throw createTransactionError('PROCESS_INACTIVE')
  }

  return process
}

function assertSubmitIdentityComplete (transaction) {
  const { error, missing_keys: missingKeys } =
    validateIdentityCompleteForSubmit(transaction)

  if (error) {
    throw createTransactionError('VALIDATION_ERROR', error, {
      details: { missing_fields: missingKeys }
    })
  }
}

async function applyIdentityUpdate (draft, body, userId = null) {
  if (userId != null && draft.user_id !== userId) {
    throw createTransactionError('UNAUTHORIZED')
  }

  if (!draft.is_active) {
    throw createTransactionError('DRAFT_INACTIVE')
  }

  const { error, value } = validateIdentityBody(body)

  if (error) {
    throw createTransactionError('VALIDATION_ERROR', error)
  }

  const input = new TransactionIdentityInputDTO(value)

  await draft.update(input.getIdentityUpdatePayload())

  return draft
}

async function applyDraftFormUpdate (draft, body, processCode, userId = null) {
  if (userId != null && draft.user_id !== userId) {
    throw createTransactionError('UNAUTHORIZED')
  }

  if (!draft.is_active) {
    throw createTransactionError('DRAFT_INACTIVE')
  }

  const { error, value } = validateUpsertDraftBody(body)

  if (error) {
    throw createTransactionError('VALIDATION_ERROR', error)
  }

  const stageConfig = await loadAuthStageConfigByProcessCode(processCode)
  const normalizedForm = validateDraftFormAgainstConfig(value.data, stageConfig)

  if (typeof normalizedForm === 'string') {
    throw createTransactionError('VALIDATION_ERROR', normalizedForm)
  }

  await draft.update({
    data: normalizedForm
  })

  return draft
}

async function createDraft ({ userId, processId }) {
  return retryWithBackoff(async () => {
    const process = await fetchActiveProcess(processId)
    let draft = await repo.findDraftByCode(userId, process.code)

    if (draft) {
      return {
        isNew: false,
        draft: toDTO(draft)
      }
    }

    draft = await repo.create({
      code: process.code,
      user_id: userId,
      status: 'draft'
    })

    return {
      isNew: true,
      draft: toDTO(draft)
    }
  }, { label: 'transaction.createDraft' })
}

async function ensureDraftForProcess ({ userId, processId }) {
  return retryWithBackoff(async () => {
    const process = await fetchActiveProcess(processId)
    let draft = await repo.findDraftByCode(userId, process.code)
    let isNew = false

    if (draft) {
      return {
        isNew: false,
        draft,
        process
      }
    }

    const user = await userRepository.findById(userId)

    if (!user || !user.is_active) {
      throw createTransactionError('UNAUTHORIZED')
    }

    draft = await repo.create({
      code: process.code,
      user_id: userId,
      status: 'draft',
      first_name: user.first_name ?? null,
      last_name: user.last_name ?? null,
      father_name: user.father_name ?? null,
      mother_name: user.mother_name ?? null,
      national_id: user.national_id ?? null
    })

    isNew = true

    return {
      isNew,
      draft,
      process
    }
  }, { label: 'transaction.ensureDraftForProcess' })
}

async function UpdateDraft ({ userId, processId, data }) {
  return retryWithBackoff(async () => {
    const process = await fetchActiveProcess(processId)
    let draft = await repo.findDraftByCode(userId, process.code)
    let isNew = false

    if (!draft) {
      draft = await repo.create({
        code: process.code,
        user_id: userId,
        status: 'draft'
      })
      isNew = true
    } else if (draft.user_id !== userId) {
      throw createTransactionError('UNAUTHORIZED')
    }

    await applyIdentityUpdate(draft, data, userId)

    const refreshed = await repo.findById(draft.id)

    return {
      isNew,
      draft: toDTO(refreshed)
    }
  }, { label: 'transaction.updateDraft' })
}

async function upsertDraft ({ userId, processId, body = null }) {
  return retryWithBackoff(async () => {
    const process = await fetchActiveProcess(processId)
    let draft = await repo.findDraftByCode(userId, process.code)
    let isNew = false

    if (!draft) {
      draft = await repo.create({
        code: process.code,
        user_id: userId,
        status: 'draft'
      })
      isNew = true
    } else if (draft.user_id !== userId) {
      throw createTransactionError('UNAUTHORIZED')
    }

    if (hasUpsertFormPayload(body)) {
      await applyDraftFormUpdate(draft, body, process.code, userId)
      draft = await repo.findById(draft.id)
    }

    return {
      isNew,
      draft: toDTO(draft)
    }
  }, { label: 'transaction.upsertDraft' })
}

async function getUserDraftByProcess (userId, processId) {
  return retryWithBackoff(async () => {
    const process = await fetchActiveProcess(processId)
    const draft = await repo.findDraftByCode(userId, process.code)

    if (!draft) {
      throw createTransactionError('DRAFT_NOT_FOUND')
    }

    return toDTO(draft)
  }, { label: 'transaction.getUserDraftByProcess' })
}

async function getTransactionById (transactionId, userId) {
  const numericId = parsePositiveInt(transactionId, 'معرّف المعاملة')
  const transaction = await repo.findById(numericId)

  if (!transaction) {
    throw createTransactionError('TRANSACTION_NOT_FOUND')
  }

  if (userId && transaction.user_id !== userId) {
    throw createTransactionError('UNAUTHORIZED')
  }

  return toDTO(transaction)
}

// يلتقط حقول الهوية من الطلب سواء أُرسلت ضمن كائن identity أو على جذر الـ body
function extractIdentityPayload (body = {}) {
  const source = body?.identity ?? body

  const identity = {}

  for (const key of IDENTITY_KEYS) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      identity[key] = source[key]
    }
  }

  return identity
}

// يفصل حقول الهوية عن باقي الـ body حتى لا تصل للـ form payload الصارم فيُرفض
function stripIdentityFromBody (body = {}) {
  const { identity, ...rest } = body

  for (const key of IDENTITY_KEYS) {
    delete rest[key]
  }

  return rest
}

// يعيد استخدام مسودة المستخدم على نفس العملية إن وُجدت، وإلا ينشئ ترانزكشن
// جديد وينسخ هوية المستخدم من حسابه كأساس (نفس نمط ensureDraftForProcess)
async function resolveSubmitDraftForProcess ({ userId, process }) {
  let draft = await repo.findDraftByCode(userId, process.code)

  if (draft) {
    if (draft.user_id !== userId) {
      throw createTransactionError('UNAUTHORIZED')
    }

    return { draft, isNew: false }
  }

  const user = await userRepository.findById(userId)

  if (!user || !user.is_active) {
    throw createTransactionError('UNAUTHORIZED')
  }

  draft = await repo.create({
    code: process.code,
    user_id: userId,
    status: 'draft',
    first_name: user.first_name ?? null,
    last_name: user.last_name ?? null,
    father_name: user.father_name ?? null,
    mother_name: user.mother_name ?? null,
    national_id: user.national_id ?? null
  })

  return { draft, isNew: true }
}

// مدخل التقديم بمعرّف العملية: يجهّز/يحدّث المسودة ثم يفوّض التقديم الفعلي
// للدالة الأساسية submitTransaction (إيدمبوتنسي/توقيع/معاملة ذرّية/تراجع)
async function submitTransactionByProcess (
  processId,
  body = {},
  {
    userId,
    idempotencyKey = null,
    clientMeta = {}
  } = {}
) {
  const { draft } = await retryWithBackoff(async () => {
    // 1) التأكد أن العملية موجودة ونشطة
    const process = await fetchActiveProcess(processId)

    // 2) إيجاد/إنشاء المسودة لهذا المستخدم على هذه العملية
    const { draft, isNew } = await resolveSubmitDraftForProcess({ userId, process })

    // 3) التحقق من بيانات الهوية القادمة في الطلب وتطبيقها (نفس فالديت UpdateDraft)
    const identityBody = extractIdentityPayload(body)

    if (Object.keys(identityBody).length) {
      await applyIdentityUpdate(draft, identityBody, userId)
    }

    return { draft, isNew }
  }, { label: 'transaction.submitTransactionByProcess' })

  // 4) تمرير الـ form payload (بدون حقول الهوية) للدالة الأساسية للتقديم
  const formPayload = stripIdentityFromBody(body)

  return submitTransaction(draft.id, formPayload, {
    userId,
    idempotencyKey,
    clientMeta
  })
}

async function submitTransaction (
  transactionId,
  data,
  {
    userId,
    idempotencyKey: idempotencyKeyOverride = null,
    clientMeta = {}
  } = {}
) {
  const numericId = parsePositiveInt(transactionId, 'معرّف المعاملة')
  const guardKey = idempotencyKeyOverride || buildSubmitGuardKey(numericId)

  if (userId) {
    const replay = operationGuardService.getReplay({
      scope: SUBMIT_IDEMPOTENCY_SCOPE,
      userId,
      idempotencyKey: guardKey
    })

    if (replay?.data) {
      return replay.data
    }
  }

  const transaction = await repo.findById(numericId)

  if (!transaction) {
    throw createTransactionError('TRANSACTION_NOT_FOUND')
  }

  if (userId && transaction.user_id !== userId) {
    throw createTransactionError('UNAUTHORIZED')
  }

  if (transaction.status !== 'draft') {
    throw createTransactionError('SUBMIT_NOT_DRAFT')
  }

  assertSubmitIdentityComplete(transaction)

  let guardContext = null
  const issuedIdempotencyKey = uuidv4()

  try {
    if (userId) {
      const guard = operationGuardService.begin({
        scope: SUBMIT_IDEMPOTENCY_SCOPE,
        userId,
        resourceId: String(numericId),
        idempotencyKey: guardKey
      })

      if (guard.replay) {
        return guard.result.data
      }

      guardContext = guard.context
    }

    const result = await (async () => {
      const current = await repo.findById(numericId)

      if (!current) {
        throw createTransactionError('TRANSACTION_NOT_FOUND')
      }

      if (userId && current.user_id !== userId) {
        throw createTransactionError('UNAUTHORIZED')
      }

      if (current.status !== 'draft') {
        throw createTransactionError('SUBMIT_NOT_DRAFT')
      }

      assertSubmitIdentityComplete(current)

      const { stage, configJson } =
        await loadAuthStageByProcessCode(current.code)

      const normalized = await validateSubmitTransactionRequest(
        data,
        configJson,
        { stageName: stage.name }
      ).catch(err => {
        throw createTransactionError('VALIDATION_ERROR', err.message, {
          details: err.details,
          validation: err.validation
        })
      })

      const requiresSignature = await userRequiresSubmitSignature(userId)
      const submitSignature = extractSubmitSignature(normalized)

      if (requiresSignature) {
        if (!submitSignature) {
          throw createTransactionError(
            'SIGNATURE_REQUIRED',
            'التوقيع الرقمي مطلوب — POST /api/transaction/{transactionId}/submit-documents/signing-challenge ثم أرسل signature مع submit'
          )
        }

        await verifySignatureForComplete({
          challengeId: submitSignature.challengeId,
          signature: submitSignature.signature,
          userId,
          decision: 'approve',
          clientMeta,
          expectedTaskId: buildDraftSubmitTaskId(current.id)
        })
      } else if (submitSignature) {
        throw createTransactionError(
          'VALIDATION_ERROR',
          'signature غير مطلوب لتقديم المواطن — احذف signature من الطلب'
        )
      }

      let registeredFiles = []
      const processCode = current.code
      let storedData = null

      await db.sequelize.transaction(async (dbTransaction) => {
        if (requiresSignature && submitSignature) {
          await persistVerifiedSignature({
            challengeId: submitSignature.challengeId,
            signature: submitSignature.signature,
            userId,
            clientMeta,
            dbTransaction
          })
        }

        if (Array.isArray(normalized.files) && normalized.files.length) {
          registeredFiles = await registerTransactionFiles({
            transactionId: current.id,
            files: normalized.files,
            userId,
            dbTransaction
          })
        }

        storedData = buildStoredSubmissionData(
          {
            ...normalized,
            files: registeredFiles
          },
          {
            stageName: stage.name,
            configJson
          }
        )

        await current.update(
          {
            data: storedData,
            status: 'submitted'
          },
          { transaction: dbTransaction }
        )

        await ensureTransactionIdProcess(current, { transaction: dbTransaction })
        await ensureGenesisHash(current, { transaction: dbTransaction })
      })

      try {
        await startWorkflow({
          transactionId: current.id,
          processCode,
          submissionPayload: storedData
        })
      } catch (error) {
        await db.sequelize.transaction(async (dbTransaction) => {
          const failed = await repo.findById(numericId, dbTransaction)

          if (failed && failed.status === 'submitted') {
            await failed.update({ status: 'draft' }, { transaction: dbTransaction })
          }
        })

        const detail = formatClientErrorMessage(error) || error.message

        throw createTransactionError('WORKFLOW_START_FAILED', detail)
      }

      const refreshed = await repo.findById(numericId)

      return wrapSubmitResult(
        toDTO(refreshed),
        issuedIdempotencyKey,
        false
      )
    })()

    if (guardContext) {
      return operationGuardService.commit(guardContext, { data: result }).data
    }

    return result
  } catch (error) {
    operationGuardService.release(guardContext)
    throw error
  }
}

module.exports = {
  UpdateDraft,
  createDraft,
  upsertDraft,
  ensureDraftForProcess,
  getUserDraftByProcess,
  getTransactionById,
  submitTransaction,
  submitTransactionByProcess,
  MESSAGES
}
