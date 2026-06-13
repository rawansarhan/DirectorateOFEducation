'use strict'

const { createSigningChallenge } = require('./transactionSigningService')
const completeTaskService = require('./completeTaskService')
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

async function createDocumentSubmitSigningChallenge ({
  taskId,
  userId,
  payload,
  clientMeta
}) {
  const { value, error } = validateDocumentSubmitSigningChallenge(payload)

  if (error) {
    throw createDocumentSubmitError('VALIDATION_ERROR', error)
  }

  return retryWithBackoff(
    () =>
      createSigningChallenge({
        taskId,
        userId,
        payload: {
          pin: value.pin,
          decision: 'approve'
        },
        clientMeta,
        forceSignature: true
      }),
    { label: `documentSubmit.signingChallenge:${taskId}` }
  ).then(data => ({
    message: 'تم إنشاء تحدي التوقيع لتقديم الوثائق بنجاح',
    data
  }))
}

async function completeDocumentSubmit ({
  taskId,
  userId,
  payload,
  clientMeta
}) {
  const { value, error } = validateDocumentSubmitComplete(payload)

  if (error) {
    throw createDocumentSubmitError('VALIDATION_ERROR', error)
  }

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
        taskId,
        userId,
        payload: completePayload,
        clientMeta,
        requireSignature: true
      }),
    { label: `documentSubmit.complete:${taskId}` }
  )

  return {
    message: 'تم تقديم الوثائق الموقّعة بنجاح',
    data: result.data
  }
}

module.exports = {
  createDocumentSubmitSigningChallenge,
  completeDocumentSubmit
}
