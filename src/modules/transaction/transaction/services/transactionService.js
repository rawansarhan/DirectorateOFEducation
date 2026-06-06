'use strict'

const repo = require('../repositories/transactionRepository')
const { toDTO } = require('../mappers/transactionMapper')
const { TransactionDraftInputDTO } = require('../dto/TransactionDraftInputDTO')
const { parsePositiveInt, validateDraftBody } = require('../validations/transactionValidations')

const workflowClient = require('../../../../core/shared/clients/workflow/workflowClient')
const outboxRepository =
  require('../../../../core/shared/outbox/repositories/OutboxRepository')

const {
  validateSubmissionAgainstConfig,
  buildStoredSubmissionData,
  loadAuthStageConfigByProcessCode
} = require('../../../workflow/services/stageSubmissionService')

const EVENTS = require('../../../../core/shared/events/types')

async function createDraft ({ userId, processId }) {
  const numericProcessId = parsePositiveInt(processId, 'معرّف العملية')

  const process = await workflowClient.getProcessById(numericProcessId)

  if (!process) {
    throw new Error('Process not found')
  }

  if (!process.is_active) {
    throw new Error('Process is inactive')
  }

  const processCode = process.code
  let draft = await repo.findDraftByCode(userId, processCode)

  if (draft) {
    return toDTO(draft)
  }

  draft = await repo.create({
    code: processCode,
    user_id: userId,
    status: 'draft'
  })

  return {
    isNew: true,
    draft: toDTO(draft)
  }
}

async function UpdateDraft ({ transId, data }) {
  const numericTransId = parsePositiveInt(transId, 'معرّف المسودة')
  const { error, value } = validateDraftBody(data)

  if (error) {
    throw new Error(error)
  }

  const draft = await repo.findDraft(numericTransId)

  if (!draft) {
    throw new Error('لا يوجد مسودة')
  }

  if (!draft.is_active) {
    throw new Error('المسودة غير مفعلة')
  }

  const input = new TransactionDraftInputDTO(value)

  await draft.update({
    data: {
      ...input.data
    }
  })

  return {
    isNew: false,
    draft: toDTO(draft)
  }
}

async function getUserDraftByProcess (userId, processId) {
  const numericProcessId = parsePositiveInt(processId, 'معرّف العملية')
  const process = await workflowClient.getProcessById(numericProcessId)

  if (!process) {
    throw new Error('لا يوجد عملية')
  }

  const draft = await repo.findDraftByCode(userId, process.code)

  if (!draft) {
    throw new Error('لا يوجد مسودة')
  }

  return toDTO(draft)
}

async function getTransactionById (transactionId, userId) {
  const numericId = parsePositiveInt(transactionId, 'معرّف المعاملة')
  const transaction = await repo.findById(numericId)

  if (!transaction) {
    throw new Error('Transaction not found')
  }

  if (userId && transaction.user_id !== userId) {
    throw new Error('Unauthorized access')
  }

  return toDTO(transaction)
}

async function submitTransaction (transactionId, data) {
  const numericId = parsePositiveInt(transactionId, 'معرّف المعاملة')
  const transaction = await repo.findById(numericId)

  if (!transaction) {
    throw new Error('Transaction not found')
  }

  if (transaction.status !== 'draft') {
    throw new Error('Only draft can be submitted')
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

  await outboxRepository.create({
    event_type: EVENTS.TRANSACTION_SUBMITTED,
    payload: {
      transactionId: transaction.id,
      processCode: transaction.code
    }
  })

  const refreshed = await repo.findById(numericId)

  return toDTO(refreshed)
}

module.exports = {
  UpdateDraft,
  createDraft,
  getUserDraftByProcess,
  getTransactionById,
  submitTransaction
}
