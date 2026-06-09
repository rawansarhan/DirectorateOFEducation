'use strict'

const repo = require('../repositories/transactionRepository')
const { toDTO } = require('../mappers/transactionMapper')
const { TransactionDraftInputDTO } = require('../dto/TransactionDraftInputDTO')
const {
  parsePositiveInt,
  validateDraftBody,
  hasDraftPayload
} = require('../validations/transactionValidations')
const {
  createTransactionError,
  MESSAGES
} = require('../utils/transactionErrors')
const { retryWithBackoff } = require('../../../../core/utils/retryWithBackoff')

const workflowClient = require('../../../../core/shared/clients/workflow/workflowClient')
const outboxRepository =
  require('../../../../core/shared/outbox/repositories/OutboxRepository')

const {
  validateSubmissionAgainstConfig,
  buildStoredSubmissionData,
  loadAuthStageConfigByProcessCode
} = require('../../../workflow/services/stageSubmissionService')

const EVENTS = require('../../../../core/shared/events/types')
const { ensureGenesisHash } =
  require('../../integrityChain/services/integrityChainService')

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

async function applyDraftDataUpdate (draft, data, userId = null) {
  if (userId != null && draft.user_id !== userId) {
    throw createTransactionError('UNAUTHORIZED')
  }

  if (!draft.is_active) {
    throw createTransactionError('DRAFT_INACTIVE')
  }

  const { error, value } = validateDraftBody(data)

  if (error) {
    throw createTransactionError('VALIDATION_ERROR', error)
  }

  const input = new TransactionDraftInputDTO(value)
  const identityPayload = input.getIdentityUpdatePayload()

  await draft.update({
    data: {
      ...(draft.data || {}),
      ...input.data
    },
    ...identityPayload
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

async function UpdateDraft ({ transId, data, userId = null }) {
  return retryWithBackoff(async () => {
    const numericTransId = parsePositiveInt(transId, 'معرّف المسودة')
    const draft = await repo.findDraft(numericTransId)

    if (!draft) {
      throw createTransactionError('DRAFT_NOT_FOUND')
    }

    await applyDraftDataUpdate(draft, data, userId)

    const refreshed = await repo.findById(numericTransId)

    return {
      isNew: false,
      draft: toDTO(refreshed)
    }
  }, { label: 'transaction.updateDraft' })
}

async function upsertDraft ({ userId, processId, data = null }) {
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
    }

    if (hasDraftPayload(data)) {
      await applyDraftDataUpdate(draft, data, userId)
      draft = await repo.findById(draft.id)
    } else if (draft.user_id !== userId) {
      throw createTransactionError('UNAUTHORIZED')
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

async function submitTransaction (transactionId, data) {
  return retryWithBackoff(async () => {
    const numericId = parsePositiveInt(transactionId, 'معرّف المعاملة')
    const transaction = await repo.findById(numericId)

    if (!transaction) {
      throw createTransactionError('TRANSACTION_NOT_FOUND')
    }

    if (transaction.status !== 'draft') {
      throw createTransactionError('SUBMIT_NOT_DRAFT')
    }

    const configJson =
      await loadAuthStageConfigByProcessCode(transaction.code)

    const normalized = await validateSubmissionAgainstConfig(
      data,
      configJson,
      {
        mode: 'submit',
        requireVariables: Boolean(
          (configJson.actions || []).length ||
          data?.variables?.action
        )
      }
    )

    if (!normalized.variables.action) {
      normalized.variables.action = 'submit'
    }

    const storedData = buildStoredSubmissionData(normalized)

    await transaction.update({
      data: storedData,
      status: 'submitted'
    })

    await ensureGenesisHash(transaction)

    await outboxRepository.create({
      event_type: EVENTS.TRANSACTION_SUBMITTED,
      payload: {
        transactionId: transaction.id,
        processCode: transaction.code
      }
    })

    const refreshed = await repo.findById(numericId)

    return toDTO(refreshed)
  }, { label: 'transaction.submit' })
}

module.exports = {
  UpdateDraft,
  createDraft,
  upsertDraft,
  getUserDraftByProcess,
  getTransactionById,
  submitTransaction,
  MESSAGES
}
