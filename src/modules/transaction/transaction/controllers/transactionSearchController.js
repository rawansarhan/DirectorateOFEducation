'use strict'

const {
  searchCompletedTransactions,
  searchRejectedTransactions
} = require('../services/transactionSearchService')
const {
  successResponse,
  errorResponse
} = require('../utils/transactionResponse')
const {
  mapErrorToArabic,
  httpStatusForError
} = require('../utils/transactionErrors')

async function searchCompletedTransactionsController (req, res) {
  try {
    const result = await searchCompletedTransactions(req.user.id, req.query)

    return successResponse(res, {
      message: result.message,
      data: result.data
    })
  } catch (err) {
    return errorResponse(res, {
      statusCode: err.statusCode || httpStatusForError(err),
      message: mapErrorToArabic(err),
      error: err.code || 'REQUEST_ERROR',
      data: null
    })
  }
}

async function searchRejectedTransactionsController (req, res) {
  try {
    const result = await searchRejectedTransactions(req.user.id, req.query)

    return successResponse(res, {
      message: result.message,
      data: result.data
    })
  } catch (err) {
    return errorResponse(res, {
      statusCode: err.statusCode || httpStatusForError(err),
      message: mapErrorToArabic(err),
      error: err.code || 'REQUEST_ERROR',
      data: null
    })
  }
}

module.exports = {
  searchCompletedTransactionsController,
  searchRejectedTransactionsController,
  // توافق مع الاسم القديم
  searchTransactionsController: searchCompletedTransactionsController
}
