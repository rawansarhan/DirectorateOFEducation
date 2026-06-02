'use strict'

const ApiResponder = require('../../../core/utils/apiResponder')
const { HTTP_STATUS } = require('../../../core/middleware/httpStatusCodes')
const { getTransactionFullView } = require('../services/documentPackService')

async function getTransactionFullController (req, res) {
  try {
    const transactionId = Number.parseInt(req.params.id, 10)

    if (!Number.isInteger(transactionId) || transactionId < 1) {
      return ApiResponder.badRequestResponse(
        res,
        'Invalid transaction id',
        'VALIDATION_ERROR'
      )
    }

    const result = await getTransactionFullView(transactionId)

    return ApiResponder.okResponse(
      res,
      result,
      'تم جلب المعاملة الكاملة بنجاح'
    )
  } catch (error) {
    const statusCode = error.message === 'Transaction not found'
      ? HTTP_STATUS.NOT_FOUND
      : HTTP_STATUS.BAD_REQUEST

    return ApiResponder.errorResponse(
      res,
      error.message,
      statusCode,
      error.code || error.message
    )
  }
}

module.exports = {
  getTransactionFullController
}
