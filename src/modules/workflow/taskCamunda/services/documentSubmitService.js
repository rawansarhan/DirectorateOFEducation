'use strict'

const { createSigningChallenge, createDraftSubmitSigningChallenge } = require('./transactionSigningService')
const completeTaskService = require('./completeTaskService')
const { resolveDocumentSubmitTask } = require('./resolveDocumentSubmitTaskService')
const transactionRepository = require('../../../transaction/transaction/repositories/transactionRepository')
const { submitTransaction, ensureDraftForProcess } = require('../../../transaction/transaction/services/transactionService')
const { parsePositiveInt } = require('../../../transaction/transaction/validations/transactionValidations')
const { retryWithBackoff } = require('../../../../core/utils/retryWithBackoff')
const {
  validateDocumentSubmitSigningChallenge,
  validateDocumentSubmitComplete
} = require('../../schemas/documentSubmitSchema')

function createDocumentSubmitError (code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

async function resolveTaskIdForDocumentSubmit ({
  taskId = null,
  transactionId = null,
  userId,
  acquireLock = true
}) {
  if (taskId) {
    return { taskId: String(taskId).trim() }
  }

  if (!transactionId) {
    throw createDocumentSubmitError(
      'VALIDATION_ERROR',
      'taskId أو transactionId مطلوب'
    )
  }

  const resolved = await resolveDocumentSubmitTask({
    transactionId,
    userId,
    acquireLock
  })

  return {
    taskId: resolved.taskId,
    transactionId: resolved.transaction.id
  }
}

async function createDocumentSubmitSigningChallenge ({
  taskId = null,
  transactionId = null,
  userId,
  payload,
  clientMeta
}) {
  const { value, error } = validateDocumentSubmitSigningChallenge(payload)

  if (error) {
    throw createDocumentSubmitError('VALIDATION_ERROR', error)
  }

  if (transactionId && !taskId) {
    const numericTransactionId = parsePositiveInt(
      transactionId,
      'معرّف المعاملة'
    )
    const transaction = await transactionRepository.findById(numericTransactionId)

    if (!transaction) {
      throw createDocumentSubmitError('TRANSACTION_NOT_FOUND', 'المعاملة غير موجودة')
    }

    if (transaction.status === 'draft') {
      return retryWithBackoff(
        () =>
          createDraftSubmitSigningChallenge({
            transactionId: numericTransactionId,
            userId,
            payload: { pin: value.pin },
            clientMeta
          }),
        { label: `documentSubmit.draftSigningChallenge:${numericTransactionId}` }
      ).then(data => ({
        message: 'تم إنشاء تحدي التوقيع لتقديم المعاملة بنجاح',
        data
      }))
    }
  }

  const { taskId: resolvedTaskId } = await resolveTaskIdForDocumentSubmit({
    taskId,
    transactionId,
    userId,
    acquireLock: true
  })

  return retryWithBackoff(
    () =>
      createSigningChallenge({
        taskId: resolvedTaskId,
        userId,
        payload: {
          pin: value.pin,
          decision: 'approve'
        },
        clientMeta,
        forceSignature: true
      }),
    { label: `documentSubmit.signingChallenge:${resolvedTaskId}` }
  ).then(data => ({
    message: 'تم إنشاء تحدي التوقيع لتقديم الوثائق بنجاح',
    data
  }))
}

async function createDocumentSubmitSigningChallengeByProcess ({
  processId,
  userId,
  payload,
  clientMeta
}) {
  const { value, error } = validateDocumentSubmitSigningChallenge(payload)

  if (error) {
    throw createDocumentSubmitError('VALIDATION_ERROR', error)
  }

  const { draft, isNew } = await ensureDraftForProcess({
    userId,
    processId
  })

  const challengeData = await retryWithBackoff(
    () =>
      createDraftSubmitSigningChallenge({
        transactionId: draft.id,
        userId,
        payload: { pin: value.pin },
        clientMeta
      }),
    { label: `documentSubmit.draftSigningChallenge:process:${processId}` }
  )

  return {
    message: 'تم إنشاء تحدي التوقيع لتقديم المعاملة بنجاح',
    data: {
      ...challengeData,
      draft_created: isNew
    }
  }
}

function buildDraftCompleteResponse (result, workflowStatus = 'running') {
  return {
    data: result.data ?? {},
    first_name: result.first_name ?? null,
    last_name: result.last_name ?? null,
    father_name: result.father_name ?? null,
    mother_name: result.mother_name ?? null,
    national_id: result.national_id ?? null,
    idempotent_replay: Boolean(result.idempotent_replay),
    workflow_status: workflowStatus
  }
}

async function completeDraftDocumentSubmit ({
  transactionId,
  userId,
  value,
  clientMeta
}) {
  const submitPayload = {
    form_id: value.form_id,
    form_name: value.form_name,
    widgets: value.widgets,
    templates: value.templates,
    note: value.note,
    signature: value.signature,
    expected_version: value.expected_version
  }

  const result = await submitTransaction(transactionId, submitPayload, {
    userId,
    clientMeta,
    requireSignature: true
  })

  return {
    message: 'تم تقديم المعاملة الموقّعة بنجاح',
    data: buildDraftCompleteResponse(result, 'running')
  }
}

async function completeDocumentSubmit ({
  taskId = null,
  transactionId = null,
  userId,
  payload,
  clientMeta
}) {
  const { value, error } = validateDocumentSubmitComplete(payload)

  if (error) {
    throw createDocumentSubmitError('VALIDATION_ERROR', error)
  }

  if (transactionId && !taskId) {
    const numericTransactionId = parsePositiveInt(
      transactionId,
      'معرّف المعاملة'
    )
    const transaction = await transactionRepository.findById(numericTransactionId)

    if (transaction?.status === 'draft') {
      return completeDraftDocumentSubmit({
        transactionId: numericTransactionId,
        userId,
        value,
        clientMeta
      })
    }
  }

  const { taskId: resolvedTaskId } = await resolveTaskIdForDocumentSubmit({
    taskId,
    transactionId,
    userId,
    acquireLock: false
  })

  const completePayload = {
    form_id: value.form_id,
    form_name: value.form_name,
    widgets: value.widgets,
    templates: value.templates,
    decision: value.decision,
    signature: value.signature,
    expected_version: value.expected_version,
    note: value.note
  }

  const result = await retryWithBackoff(
    () =>
      completeTaskService.completeTask({
        taskId: resolvedTaskId,
        userId,
        payload: completePayload,
        clientMeta,
        requireSignature: true
      }),
    { label: `documentSubmit.complete:${resolvedTaskId}` }
  )

  return {
    message: 'تم تقديم الوثائق الموقّعة بنجاح',
    data: result.data
  }
}

module.exports = {
  createDocumentSubmitSigningChallenge,
  createDocumentSubmitSigningChallengeByProcess,
  completeDocumentSubmit
}
