'use strict'

const ApiResponder = require('../../../../core/utils/apiResponder')
const {
  getIntegrityChain,
  verifyIntegrityChain,
  verifyDocumentQr
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

/**
 * تحقق عام من رمز QR المضمّن في وثيقة PDF (مسح بدون مصادقة).
 * يقرأ المعطيات من query: tx, g (genesis), doc, s (signature).
 */
async function verifyDocumentController (req, res) {
  try {
    const source = { ...req.query, ...(req.body || {}) }

    const result = await verifyDocumentQr({
      transactionId: source.tx,
      genesisHash: source.g,
      documentInstanceId: source.doc,
      signatureBase64Url: source.s
    })

    return ApiResponder.okResponse(
      res,
      result,
      result.valid
        ? 'الوثيقة صحيحة وسلسلة التواقيع صالحة'
        : (result.reason || 'الوثيقة غير صالحة أو سلسلة التواقيع غير مكتملة')
    )
  } catch (error) {
    const statusCode = error.message === 'Transaction not found' ? 404 : 400

    return ApiResponder.errorResponse(res, error.message, statusCode)
  }
}

module.exports = {
  getIntegrityChainController,
  verifyIntegrityChainController,
  verifyDocumentController
}
