'use strict'

const ApiResponder = require('../../../../core/utils/apiResponder')
const {
  getTransactionDocuments
} = require('../services/transactionDocumentsService')

async function getTransactionDocumentsController (req, res) {
  try {
    const transactionId = Number.parseInt(req.params.transactionId, 10)

    if (!Number.isInteger(transactionId) || transactionId < 1) {
      return ApiResponder.badRequestResponse(res, 'معرّف المعاملة غير صالح')
    }

    const result = await getTransactionDocuments(transactionId, {
      userId: req.user?.id ?? null
    })

    return ApiResponder.okResponse(
      res,
      result,
      'تم جلب وثائق المعاملة بنجاح'
    )
  } catch (error) {
    const statusCode = error.message === 'Transaction not found'
      ? 404
      : error.message === 'Unauthorized access'
        ? 403
        : 400

    return ApiResponder.errorResponse(res, error.message, statusCode)
  }
}

module.exports = {
  getTransactionDocumentsController
}
