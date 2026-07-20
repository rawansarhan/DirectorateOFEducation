'use strict'

const ApiResponder = require('../../../../core/utils/apiResponder')
const {
  getIntegrityChain,
  verifyIntegrityChain,
  verifyDocumentQr
} = require('../services/integrityChainService')
const {
  wantsHtmlResponse,
  buildPublicVerifyResult,
  renderDocumentVerifyHtml,
  renderDocumentVerifyErrorHtml
} = require('../views/documentVerifyPublicView')
const transactionRepository =
  require('../../transaction/repositories/transactionRepository')
const {
  buildDocumentQrScanBundle
} = require('../services/documentQrScanBundleService')
const {
  issueDocumentDetailsCode,
  resolveDocumentDetailsCode
} = require('../services/documentDetailsCodeService')

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
 * الشاشة العامة بسيطة؛ التفاصيل عبر details_code + /document/details.
 */
async function verifyDocumentController (req, res) {
  const asHtml = wantsHtmlResponse(req)

  try {
    const source = { ...req.query, ...(req.body || {}) }

    const result = await verifyDocumentQr({
      transactionId: source.tx,
      genesisHash: source.g,
      documentInstanceId: source.doc,
      signatureBase64Url: source.s
    })

    const transaction = result.transaction_id
      ? await transactionRepository.findById(result.transaction_id)
      : null

    const detailsMeta =
      result.valid && transaction
        ? await issueDocumentDetailsCode(transaction.id)
        : null

    const publicResult = buildPublicVerifyResult(result, transaction, detailsMeta)

    if (asHtml) {
      return res
        .status(publicResult.valid ? 200 : 400)
        .type('html')
        .send(renderDocumentVerifyHtml(publicResult))
    }

    return ApiResponder.okResponse(
      res,
      publicResult,
      publicResult.message
    )
  } catch (error) {
    const statusCode = error.message === 'Transaction not found' ? 404 : 400

    if (asHtml) {
      return res
        .status(statusCode)
        .type('html')
        .send(renderDocumentVerifyErrorHtml({
          message: error.message === 'Transaction not found'
            ? 'المعاملة غير موجودة'
            : error.message
        }))
    }

    return ApiResponder.errorResponse(res, error.message, statusCode)
  }
}

/**
 * جلب تفاصيل المعاملة باستخدام رمز QR (6 أرقام) — يتطلب Bearer token.
 */
async function getDocumentVerifyDetailsController (req, res) {
  try {
    const code = req.query.code || req.body?.code || req.body?.details_code
    const { transactionId } = await resolveDocumentDetailsCode(code)
    const transaction = await transactionRepository.findById(transactionId)

    if (!transaction) {
      return ApiResponder.errorResponse(res, 'المعاملة غير موجودة', 404)
    }

    const bundle = await buildDocumentQrScanBundle(transaction)

    return ApiResponder.okResponse(
      res,
      bundle,
      'تم جلب تفاصيل التحقق من الوثيقة بنجاح'
    )
  } catch (error) {
    const statusCode = error.message === 'Transaction not found' ? 404 : 400
    return ApiResponder.errorResponse(res, error.message, statusCode)
  }
}

module.exports = {
  getIntegrityChainController,
  verifyIntegrityChainController,
  verifyDocumentController,
  getDocumentVerifyDetailsController
}
