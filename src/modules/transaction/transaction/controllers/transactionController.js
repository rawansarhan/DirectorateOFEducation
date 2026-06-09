'use strict'

const {
  UpdateDraft,
  createDraft,
  upsertDraft,
  getUserDraftByProcess,
  getTransactionById,
  submitTransaction,
  MESSAGES
} = require('../services/transactionService')
const {
  successResponse,
  errorResponse
} = require('../utils/transactionResponse')
const {
  mapErrorToArabic,
  httpStatusForError
} = require('../utils/transactionErrors')
const { hasDraftPayload } = require('../validations/transactionValidations')

function handleTransactionError (res, err) {
  const statusCode = httpStatusForError(err)
  const message = mapErrorToArabic(err)

  return errorResponse(res, {
    statusCode,
    message,
    error: message
  })
}

async function createDraftController (req, res) {
  try {
    const result = await createDraft({
      userId: req.user.id,
      processId: req.params.processId
    })

    const message = result.isNew
      ? MESSAGES.DRAFT_CREATED
      : MESSAGES.DRAFT_RETRIEVED

    return successResponse(res, {
      message,
      data: result
    })
  } catch (err) {
    return handleTransactionError(res, err)
  }
}

async function updateDraftController (req, res) {
  try {
    const result = await UpdateDraft({
      transId: req.params.transId,
      data: req.body,
      userId: req.user.id
    })

    return successResponse(res, {
      message: MESSAGES.DRAFT_UPDATED,
      data: result
    })
  } catch (err) {
    return handleTransactionError(res, err)
  }
}

async function upsertDraftController (req, res) {
  try {
    const result = await upsertDraft({
      userId: req.user.id,
      processId: req.params.processId,
      data: req.body
    })

    let message = MESSAGES.DRAFT_RETRIEVED

    if (result.isNew) {
      message = hasDraftPayload(req.body)
        ? MESSAGES.DRAFT_UPSERT_CREATED
        : MESSAGES.DRAFT_CREATED
    } else if (hasDraftPayload(req.body)) {
      message = MESSAGES.DRAFT_UPSERT_UPDATED
    }

    return successResponse(res, {
      message,
      data: result
    })
  } catch (err) {
    return handleTransactionError(res, err)
  }
}

async function getUserDraftByProcessController (req, res) {
  try {
    const result = await getUserDraftByProcess(
      req.user.id,
      req.params.processId
    )

    return successResponse(res, {
      message: MESSAGES.DRAFT_RETRIEVED,
      data: result
    })
  } catch (err) {
    return handleTransactionError(res, err)
  }
}

async function getTransactionController (req, res) {
  try {
    const result = await getTransactionById(
      req.params.transactionId,
      req.user.id
    )

    return successResponse(res, {
      message: MESSAGES.TRANSACTION_RETRIEVED,
      data: result
    })
  } catch (err) {
    return handleTransactionError(res, err)
  }
}

async function submitTransactionController (req, res) {
  try {
    const result = await submitTransaction(
      req.params.transactionId,
      req.body
    )

    return successResponse(res, {
      message: MESSAGES.TRANSACTION_SUBMITTED,
      data: result
    })
  } catch (err) {
    return handleTransactionError(res, err)
  }
}

module.exports = {
  createDraftController,
  updateDraftController,
  upsertDraftController,
  UpdateDraftController: updateDraftController,
  getUserDraftByProcessController,
  getTransactionController,
  submitTransactionController
}
