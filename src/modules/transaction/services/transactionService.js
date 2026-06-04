const repo = require('../repositories/transactionRepository')

const workflowClient = require('../../../core/shared/clients/workflow/workflowClient')

const eventBus = require('../../../core/shared/events/eventBus')

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
// ======================================================
// CREATE OR UPDATE DRAFT
// ======================================================

async function createDraft ({ userId, processId }) {
  // =====================================
  // GET PROCESS
  // =====================================

  const process = await workflowClient.getProcessById(processId)
  console.log(process)
  if (!process) {
    throw new Error('Process not found')
  }

  if (!process.is_active) {
    throw new Error('Process is inactive')
  }

  // =====================================
  // PROCESS CODE
  // =====================================

  const processCode = process.code

  // =====================================
  // CHECK EXISTING DRAFT
  // =====================================

  let draft = await repo.findDraftByCode(userId, processCode)

  // =====================================
  // UPDATE EXISTING DRAFT
  // =====================================

  if (draft) {

  return draft
  }

  // =====================================
  // CREATE NEW DRAFT
  // =====================================

  draft = await repo.create({
    code: processCode,

    user_id: userId,

    status: 'draft'
  })



  return {
    isNew: true,

    draft
  }
}

// ======================================================
//  UPDATE DRAFT
// ======================================================

async function UpdateDraft ({ transId, data }) {
  // =====================================
  // GET PROCESS
  // =====================================

   const draft = await repo.findDraft(transId)
  console.log(process)
  if (!draft) {
    throw new Error('لا يوجد مسودة')
  }

  if (!draft.is_active) {
    throw new Error('المسودة غير مفعلة')
  }

  // =====================================
  // UPDATE EXISTING DRAFT
  // =====================================

    await draft.update({
      data: {
        ...data
      }
    })

    return {
      isNew: false,
      draft
    }
  }




// ======================================================
// GET USER DRAFT BY PROCESS
// ======================================================

async function getUserDraftByProcess (userId, processId) {
  // =====================================
  // GET PROCESS
  // =====================================

  const process = await workflowClient.getProcessById(processId)
  console.log({
    now: new Date(),
    start_date: process.start_date,
    end_date: process.end_date
  })
  if (!process) {
    throw new Error('لا يوجد عملية')
  }

  // =====================================
  // FIND DRAFT
  // =====================================

  const draft = await repo.findDraftByCode(userId, process.code)

  if (!draft) {
    throw new Error('لا يوجد مسودة')
  }

  return draft
  
}

// ======================================================
// GET TRANSACTION BY ID
// ======================================================

async function getTransactionById (transactionId, userId) {
  const transaction = await repo.findById(transactionId)

  if (!transaction) {
    throw new Error('Transaction not found')
  }

  // =====================================
  // SECURITY
  // =====================================

  if (userId && transaction.user_id !== userId) {
    throw new Error('Unauthorized access')
  }

  return transaction
}

// ======================================================
// SUBMIT TRANSACTION
// ======================================================

async function submitTransaction (transactionId , data  ) {

  // =====================================
  // GET TRANSACTION
  // =====================================
  const transaction = await repo.findById(transactionId)

  if (!transaction) {
    throw new Error('Transaction not found')
  }

  // =====================================
  // VALIDATION
  // =====================================

  if (transaction.status !== 'draft') {
    throw new Error('Only draft can be submitted')
  }

  // =====================================
  // UPDATE TRANSACTION
  // =====================================

  await transaction.update({
      data: {
        ...data
      },
    status: 'submitted'
  })

  // =====================================
  // EVENT
  // =====================================

await outboxRepository.create({

  event_type: EVENTS.TRANSACTION_SUBMITTED,

  payload: {

    transactionId: transaction.id,

    processCode: transaction.code
  }
})

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
///////////////////////////////////////////////////////////////



module.exports = {
  UpdateDraft,

  createDraft,

  getUserDraftByProcess,

  getTransactionById,

  submitTransaction
}
