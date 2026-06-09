'use strict'

const ApiResponder = require('../../../../core/utils/apiResponder')
const {
  getIntegrityChain,
  verifyIntegrityChain
} = require('../services/integrityChainService')

async function getIntegrityChainController (req, res) {
  try {
    const transactionId = Number.parseInt(req.params.transactionId, 10)

    if (!Number.isInteger(transactionId) || transactionId < 1) {
      return ApiResponder.badRequestResponse(res, 'معرّف المعاملة غير صالح')
    }

    const result = await getIntegrityChain(transactionId, {
      userId: req.user.id
    })

    return ApiResponder.okResponse(
      res,
      result,
      'تم جلب سلسلة النزاهة بنجاح'
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

async function verifyIntegrityChainController (req, res) {
  try {
    const transactionId = Number.parseInt(req.params.transactionId, 10)

    if (!Number.isInteger(transactionId) || transactionId < 1) {
      return ApiResponder.badRequestResponse(res, 'معرّف المعاملة غير صالح')
    }

    const hints = {
      ...req.query,
      ...(req.body || {})
    }

    const result = await verifyIntegrityChain(transactionId, hints)

    return ApiResponder.okResponse(
      res,
      result,
      result.valid
        ? 'سلسلة التواقيع صالحة'
        : 'سلسلة التواقيع غير صالحة أو غير مكتملة'
    )
  } catch (error) {
    const statusCode = error.message === 'Transaction not found' ? 404 : 400

    return ApiResponder.errorResponse(res, error.message, statusCode)
  }
}

module.exports = {
  getIntegrityChainController,
  verifyIntegrityChainController
}
