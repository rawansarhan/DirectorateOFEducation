'use strict'

const ApiResponder = require('../../../core/utils/apiResponder')
const { HTTP_STATUS } = require('../../../core/middleware/httpStatusCodes')
const {
  getIntegrityChain,
  verifyIntegrityChain
} = require('../services/integrityChainService')

async function getIntegrityChainController (req, res) {
  try {
    const transactionId = Number.parseInt(req.params.id, 10)

    if (!Number.isInteger(transactionId) || transactionId < 1) {
      return ApiResponder.badRequestResponse(
        res,
        'Invalid transaction id',
        'VALIDATION_ERROR'
      )
    }

    const result = await getIntegrityChain(transactionId)

    return ApiResponder.okResponse(
      res,
      result,
      'Integrity chain fetched successfully'
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

async function verifyIntegrityChainController (req, res) {
  try {
    const transactionId = Number.parseInt(req.params.id, 10)

    if (!Number.isInteger(transactionId) || transactionId < 1) {
      return ApiResponder.badRequestResponse(
        res,
        'Invalid transaction id',
        'VALIDATION_ERROR'
      )
    }

    const verification = await verifyIntegrityChain(transactionId)
    const expectedHead = req.query.head || req.body?.head || null

    if (expectedHead && verification.valid && verification.data?.head_hash !== expectedHead) {
      return ApiResponder.errorResponse(
        res,
        'المعاملة مزورة — head_hash في QR لا يطابق السجل الحالي',
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
        'HEAD_MISMATCH'
      )
    }

    if (!verification.valid) {
      return ApiResponder.errorResponse(
        res,
        verification.message,
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
        verification.reason
      )
    }

    return ApiResponder.okResponse(
      res,
      {
        valid: true,
        reason: verification.reason,
        failed_at_link: null,
        details: verification.data
      },
      verification.message
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
  getIntegrityChainController,
  verifyIntegrityChainController
}
