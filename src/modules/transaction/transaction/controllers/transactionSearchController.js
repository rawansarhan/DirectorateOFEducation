'use strict'

const { searchTransactions } = require('../services/transactionSearchService')
const {
  successResponse,
  errorResponse
} = require('../utils/transactionResponse')
const {
  mapErrorToArabic,
  httpStatusForError
} = require('../utils/transactionErrors')

async function searchTransactionsController (req, res) {
  try {
    const result = await searchTransactions(req.query)

    return successResponse(res, {
      message: result.message,
      data: result.data
    })
  } catch (err) {
    return errorResponse(res, {
      statusCode: httpStatusForError(err),
      message: mapErrorToArabic(err),
      error: err.code || 'REQUEST_ERROR',
      data: null
    })
  }
}

module.exports = {
  searchTransactionsController
}
