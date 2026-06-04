const repo = require('../repositories/transactionRepository')

const workflowClient = require('../../../core/shared/clients/workflow/workflowClient')

const outboxRepository =
  require('../../../core/shared/outbox/repositories/OutboxRepository')

const {
  validateSubmissionRequest,
  validateSubmissionAgainstConfig,
  buildStoredSubmissionData,
  loadAuthStageConfigBundleByProcessCode,
  SUBMISSION_SCHEMA_VERSION
} = require('../../workflow/services/stageSubmissionService')

const EVENTS = require('../../../core/shared/events/types')

const operationGuardService = require('../../../core/security/operationGuardService')
const { ensureGenesisHash } = require('./integrityChainService')

const {
  getOrLoad,
  KEYS,
  invalidateTransactionById,
  invalidateUserTransactionDrafts
} = require('../../../core/cache/apiCacheService')

async function assertDraftOwnership (draft, userId) {
  if (!draft) {
    throw new Error('لا يوجد مسودة')
  }

  if (userId && draft.user_id !== userId) {
    throw new Error('غير مصرح لك بتعديل هذه المعاملة')
  }

  if (!draft.is_active) {
    throw new Error('المسودة غير مفعلة')
  }

  if (draft.status !== 'draft') {
    throw new Error('يمكن تعديل المسودة فقط عندما تكون المعاملة draft')
  }
}

async function createDraft ({ userId, processId }) {
  const processIdNum = parseInt(processId, 10)

  if (!Number.isInteger(processIdNum) || processIdNum < 1) {
    throw new Error('Process not found')
  }

  return getOrLoad(
    KEYS.createDraft(userId, processIdNum),
    async () => {
      const process = await workflowClient.getProcessById(processIdNum)

      if (!process) {
        throw new Error('Process not found')
      }

      if (!process.is_active) {
        throw new Error('Process is inactive')
      }

      const processCode = process.code

      let draft = await repo.findDraftByCode(userId, processCode)

      if (draft) {
        return draft
      }

      draft = await repo.create({
        code: processCode,
        user_id: userId,
        status: 'draft'
      })

      return {
        isNew: true,
        draft
      }
    },
    { label: `POST /api/transaction/CreateDraft/${processIdNum}` }
  )
}

async function UpdateDraft ({ transId, userId, data }) {
  const draft = await repo.findById(transId)

  await assertDraftOwnership(draft, userId)

  const normalized = validateSubmissionRequest(data, { mode: 'draft' })
  const storedData = buildStoredSubmissionData(normalized)

  if (normalized.expected_version != null) {
    await repo.updateDataOptimistic(
      transId,
      storedData,
      normalized.expected_version
    )
  } else {
    await draft.update({ data: storedData })
  }

  const updated = await repo.findById(transId)

  await invalidateTransactionById(userId, transId)
  await invalidateUserTransactionDrafts(userId)

  return {
    isNew: false,
    draft: updated,
    schema_version: SUBMISSION_SCHEMA_VERSION,
    submission: normalized
  }
}

async function getUserDraftByProcess (userId, processId) {
  const processIdNum = parseInt(processId, 10)

  if (!Number.isInteger(processIdNum) || processIdNum < 1) {
    throw new Error('معرّف العملية غير صالح')
  }

  return getOrLoad(
    KEYS.transactionDraft(userId, processIdNum),
    async () => {
      const process = await workflowClient.getProcessById(processIdNum)

      if (!process) {
        throw new Error('لا يوجد عملية')
      }

      const draft = await repo.findDraftByCode(userId, process.code)

      if (!draft) {
        throw new Error('لا يوجد مسودة')
      }

      return draft
    },
    { label: `GET /api/transaction/draft/${processIdNum}` }
  )
}

async function getTransactionById (transactionId, userId) {
  const transactionIdNum = parseInt(transactionId, 10)

  if (!Number.isInteger(transactionIdNum) || transactionIdNum < 1) {
    throw new Error('Transaction not found')
  }

  return getOrLoad(
    KEYS.transactionById(userId, transactionIdNum),
    async () => {
      const transaction = await repo.findById(transactionIdNum)

      if (!transaction) {
        throw new Error('Transaction not found')
      }

      if (userId && transaction.user_id !== userId) {
        throw new Error('Unauthorized access')
      }

      return transaction
    },
    { label: `GET /api/transaction/${transactionIdNum}` }
  )
}

async function submitTransaction (transactionId, data, userId, clientMeta = {}) {
  const transaction = await repo.findById(transactionId)

  if (!transaction) {
    throw new Error('Transaction not found')
  }

  if (userId && transaction.user_id !== userId) {
    throw new Error('غير مصرح لك بإرسال هذه المعاملة')
  }

  if (transaction.status !== 'draft') {
    const plain = transaction.get
      ? transaction.get({ plain: true })
      : transaction

    return {
      ...plain,
      idempotent_replay: true
    }
  }

  if (!transaction.code) {
    throw new Error('المعاملة غير مرتبطة بعملية')
  }

  const guard = operationGuardService.begin({
    scope: 'submit_transaction',
    userId,
    resourceId: String(transactionId),
    idempotencyKey: clientMeta.idempotencyKey || data?.idempotency_key || null
  })

  if (guard.replay) {
    return guard.result
  }

  const guardContext = guard.context

  try {
    const { config_json: configJson, ui_json: uiJson } =
      await loadAuthStageConfigBundleByProcessCode(transaction.code)

    const normalized = await validateSubmissionAgainstConfig(
      data,
      configJson,
      {
        mode: 'submit',
        uiJson,
        requireVariables: Boolean(
          (uiJson.actions || []).length ||
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

    const refreshed = await repo.findById(transactionId)
    const plain = refreshed.get
      ? refreshed.get({ plain: true })
      : refreshed

    await invalidateTransactionById(userId, transactionId)
    await invalidateUserTransactionDrafts(userId)

    return operationGuardService.commit(guardContext, {
      ...plain,
      idempotent_replay: false
    })
  } catch (error) {
    operationGuardService.release(guardContext)
    throw error
  }
}

module.exports = {
  UpdateDraft,
  createDraft,
  getUserDraftByProcess,
  getTransactionById,
  submitTransaction
}
