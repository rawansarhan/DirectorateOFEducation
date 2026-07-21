'use strict'

const { getProcessById } = require('../../../workflow/public')
const { TransactionIdentityInputDTO } = require('../dto/TransactionDraftInputDTO')
const {
  parsePositiveInt,
  validateIdentityBody
} = require('../validations/transactionValidations')
const {
  validateUpsertDraftBody,
  validateDraftFormAgainstConfig
} = require('../validations/draftFormValidation')
const { createTransactionError } = require('../utils/transactionErrors')
const {
  loadAuthStageConfigByProcessCode
} = require('../../../workflow/public')

async function fetchActiveProcess (processId) {
  const numericProcessId = parsePositiveInt(processId, 'معرّف العملية')
  const process = await getProcessById(numericProcessId)

  if (!process) {
    throw createTransactionError('PROCESS_NOT_FOUND')
  }

  if (!process.is_active) {
    throw createTransactionError('PROCESS_INACTIVE')
  }

  return process
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

module.exports = {
  fetchActiveProcess,
  applyIdentityUpdate,
  applyDraftFormUpdate
}
