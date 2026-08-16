'use strict'

const repo = require('../repositories/transactionRepository')
const { toDTO } = require('../mappers/transactionMapper')
const {
  parsePositiveInt,
  validateIdentityCompleteForSubmit,
  validateIdentityBodyComplete,
  IDENTITY_KEYS
} = require('../validations/transactionValidations')
const { createTransactionError } = require('../utils/transactionErrors')
const { retryWithBackoff } = require('../../../../core/utils/retryWithBackoff')
const {
  registerTransactionFiles
} = require('../../document/services/documentFileService')
const {
  registerTemplatesForTransaction
} = require('../../document/services/documentInstanceService')
const {
  startWorkflow,
  validateSubmitTransactionRequest,
  buildStoredSubmissionData,
  loadAuthStageByProcessCode,
  verifySignatureForComplete,
  persistVerifiedSignature,
  buildDraftSubmitTaskId
} = require('../../../workflow/public')
const db = require('../../../../entities')
const { formatClientErrorMessage } = require('../../../../core/utils/errorMessageHelper')
const { v4: uuidv4 } = require('uuid')

const operationGuardService = require('../../../../core/security/operationGuardService')
const userRepository = require('../../../auth/shared/repositories/userRepository')
const userRoleAssignmentRepository = require('../../../auth/shared/repositories/userRoleAssignmentRepository')
const { ensureGenesisHash, appendIntegrityLink } =
  require('../../integrityChain/services/integrityChainService')
const { createProcessStage } =
  require('../../process_instance_stage/services/processInstanceStageService')
const {
  computeStageDataHash
} = require('../../integrityChain/utils/integrityChainUtils')
const { ensureTransactionIdProcess } =
  require('./transactionIdProcessService')
const {
  fetchActiveProcess,
  applyIdentityUpdate
} = require('./transactionServiceHelpers')

const SUBMIT_IDEMPOTENCY_SCOPE = 'submit_transaction'

function buildSubmitGuardKey (transactionId) {
  return `txn-${transactionId}`
}

async function userRequiresSubmitSignature (userId) {
  if (!userId) {
    return false
  }

  const assignments =
    await userRoleAssignmentRepository.findActiveWithOrgDeptRole(userId)

  return assignments.some(item => {
    const groupKey = item.org_department_role?.camunda_group_key
    return Boolean(groupKey) && groupKey !== 'CITIZEN'
  })
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

function assertSubmitIdentityComplete (transaction) {
  const { error, missing_keys: missingKeys } =
    validateIdentityCompleteForSubmit(transaction)

  if (error) {
    throw createTransactionError('VALIDATION_ERROR', error, {
      details: { missing_fields: missingKeys }
    })
  }
}

function assertIdentityBodyComplete (identityBody) {
  const { error, missing_keys: missingKeys } =
    validateIdentityBodyComplete(identityBody)

  if (error) {
    throw createTransactionError('VALIDATION_ERROR', error, {
      details: { missing_fields: missingKeys }
    })
  }
}

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

function stripIdentityFromBody (body = {}) {
  const { identity, ...rest } = body

  for (const key of IDENTITY_KEYS) {
    delete rest[key]
  }

  return rest
}

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

async function submitTransactionByProcess (
  processId,
  body = {},
  {
    userId,
    idempotencyKey = null,
    clientMeta = {}
  } = {}
) {
  if (await userRequiresSubmitSignature(userId)) {
    throw createTransactionError('EMPLOYEE_FORBIDDEN_CITIZEN_ROUTE')
  }

  if (extractSubmitSignature(body)) {
    throw createTransactionError('CITIZEN_SIGNATURE_NOT_ALLOWED')
  }

  const identityBody = extractIdentityPayload(body)
  assertIdentityBodyComplete(identityBody)

  const { draft, replayResult } = await retryWithBackoff(async () => {
    const process = await fetchActiveProcess(processId)

    const existingInFlight = await repo.findInFlightByUserAndCode(userId, process.code)
    if (existingInFlight) {
      return {
        replayResult: wrapSubmitResult(
          toDTO(existingInFlight),
          buildSubmitGuardKey(existingInFlight.id),
          true
        )
      }
    }

    const { draft, isNew } = await resolveSubmitDraftForProcess({ userId, process })

    await applyIdentityUpdate(draft, identityBody, userId)

    return { draft, isNew, replayResult: null }
  }, { label: 'transaction.submitTransactionByProcess' })

  if (replayResult) {
    return replayResult
  }

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
    clientMeta = {},
    requireSignature = false
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

      const requiresSignature =
        requireSignature || (await userRequiresSubmitSignature(userId))
      const submitSignature = extractSubmitSignature(normalized)

      if (requiresSignature) {
        if (!submitSignature) {
          throw createTransactionError(
            'SIGNATURE_REQUIRED',
            'التوقيع الرقمي مطلوب — POST /api/transaction/process/{processId}/submit-documents/signing-challenge ثم أرسل signature مع complete'
          )
        }

        await verifySignatureForComplete({
          challengeId: submitSignature.challengeId,
          signature: submitSignature.signature,
          userId,
          decision: 'approve',
          clientMeta,
          expectedTaskId: buildDraftSubmitTaskId(current.id),
          stageDataHash: computeStageDataHash(normalized, {
            decision: 'approve'
          })
        })
      } else if (submitSignature) {
        throw createTransactionError(
          'VALIDATION_ERROR',
          'signature غير مطلوب لتقديم المواطن — احذف signature من الطلب'
        )
      }

      let registeredFiles = []
      let registeredTemplates = []
      let digitalSignatureRecord = null
      const processCode = current.code
      let storedData = null

      await db.sequelize.transaction(async (dbTransaction) => {
        if (requiresSignature && submitSignature) {
          digitalSignatureRecord = await persistVerifiedSignature({
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

        if (Array.isArray(normalized.templates) && normalized.templates.length) {
          registeredTemplates = await registerTemplatesForTransaction({
            transactionId: current.id,
            templates: normalized.templates,
            dbTransaction
          })
        }

        storedData = buildStoredSubmissionData(
          {
            ...normalized,
            files: registeredFiles,
            templates: registeredTemplates
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

        // ختم مرحلة التقديم دائماً (مواطن بدون USB أو موظف مع توقيع)
        const stageDataHash = digitalSignatureRecord && submitSignature
          ? computeStageDataHash(normalized, { decision: 'approve' })
          : computeStageDataHash(storedData)

        if (digitalSignatureRecord) {
          await appendIntegrityLink({
            transactionId: current.id,
            digitalSignatureId: digitalSignatureRecord.digital_signature_id,
            challengeId: submitSignature.challengeId,
            stageId: stage.id,
            stageCode: stage.code,
            stageData: storedData,
            stageDataHash,
            signatureHash: digitalSignatureRecord.signed_hash,
            signedAt: digitalSignatureRecord.signed_at,
            dbTransaction
          })
        }

        await createProcessStage({
          transactionId: current.id,
          stageCode: stage.code,
          stageName: stage.name,
          status: 'completed',
          data: {
            ...storedData,
            completed_by: userId,
            completed_at: new Date().toISOString()
          },
          assigned_to: userId,
          contentHash: stageDataHash,
          challengeId: submitSignature?.challengeId || null,
          sealed: true
        }, { transaction: dbTransaction })
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

    const {
      auditSuccess
    } = require('../../../../core/security/safeAudit')
    const {
      AUDIT_ACTIONS
    } = require('../../../../core/security/auditActions')

    await auditSuccess({
      userId: userId || null,
      action: AUDIT_ACTIONS.TRANSACTION_SUBMITTED,
      resourceType: 'transaction',
      resourceId: numericId,
      ipAddress: clientMeta.ip || null,
      userAgent: clientMeta.userAgent || null,
      details: {
        transactionId: numericId,
        processId: transaction.id_process || null,
        idempotencyKey: guardKey || null
      }
    })

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
  getTransactionById,
  submitTransaction,
  submitTransactionByProcess
}
