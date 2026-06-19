'use strict'

const {
  UpdateDraft,
  createDraft,
  upsertDraft,
  getUserDraftByProcess,
  getTransactionById,
  submitTransactionByProcess,
  MESSAGES
} = require('../services/transactionService')
const { getMyTransactions, getMyTransactionCounts } = require('../services/userTransactionsService')
const { getFirstStageContentByTransactionId } = require('../services/firstStageContentService')
const {
  successResponse,
  errorResponse
} = require('../utils/transactionResponse')
const {
  mapErrorToArabic,
  httpStatusForError
} = require('../utils/transactionErrors')
const { hasUpsertFormPayload } = require('../validations/draftFormValidation')
const { getClientMeta } = require('../../../../core/security/securityConfig')
const { parsePaginationQuery } = require('../../../../core/utils/pagination')

function handleTransactionError (res, err) {
  const statusCode = httpStatusForError(err)
  const message = mapErrorToArabic(err)
  const errorCode = err.code || 'REQUEST_ERROR'

  let data = null

  if (Array.isArray(err.details) && err.details.length) {
    data = {
      details: err.details,
      ...(err.validation || {})
    }
  }

  return errorResponse(res, {
    statusCode,
    message,
    error: errorCode,
    data
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
      userId: req.user.id,
      processId: req.params.processId,
      data: req.body
    })

    const message = result.isNew
      ? MESSAGES.DRAFT_CREATED
      : MESSAGES.DRAFT_UPDATED

    return successResponse(res, {
      message,
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
      body: req.body
    })

    let message = MESSAGES.DRAFT_RETRIEVED

    if (result.isNew) {
      message = hasUpsertFormPayload(req.body)
        ? MESSAGES.DRAFT_UPSERT_CREATED
        : MESSAGES.DRAFT_CREATED
    } else if (hasUpsertFormPayload(req.body)) {
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

async function getMyTransactionsController (req, res) {
  try {
    const { page, limit, offset } = parsePaginationQuery(req.query)

    const result = await getMyTransactions({
      userId: req.user.id,
      page,
      limit,
      offset,
      statusFilter: req.query.status
    })

    return successResponse(res, {
      message: result.message,
      data: result.data
    })
  } catch (err) {
    return handleTransactionError(res, err)
  }
}

async function getMyTransactionCountsController (req, res) {
  try {
    const result = await getMyTransactionCounts({
      userId: req.user.id
    })

    return successResponse(res, {
      message: result.message,
      data: result.data
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

async function getFirstStageContentController (req, res) {
  try {
    const result = await getFirstStageContentByTransactionId(
      req.params.transactionId,
      req.user.id
    )

    return successResponse(res, {
      message: MESSAGES.FIRST_STAGE_RETRIEVED,
      data: result
    })
  } catch (err) {
    return handleTransactionError(res, err)
  }
}

async function submitTransactionController (req, res) {
  try {
    const clientMeta = getClientMeta(req)

    const result = await submitTransactionByProcess(
      req.params.processId,
      req.body,
      {
        userId: req.user.id,
        idempotencyKey: clientMeta.idempotencyKey || null,
        clientMeta
      }
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
  getMyTransactionsController,
  getMyTransactionCountsController,
  getTransactionController,
  getFirstStageContentController,
  submitTransactionController
}
