'use strict'

const {
  getCertificateBundle,
  saveFinalDocument,
  getFinalDocument
} = require('../services/transactionCertificateService')
const {
  successResponse,
  errorResponse
} = require('../../transaction/utils/transactionResponse')
const {
  mapErrorToArabic,
  httpStatusForError
} = require('../../transaction/utils/transactionErrors')

function handleCertificateError (res, err) {
  return errorResponse(res, {
    statusCode: httpStatusForError(err),
    message: mapErrorToArabic(err),
    error: err.code || 'REQUEST_ERROR',
    data: null
  })
}

async function getCertificateController (req, res) {
  try {
    const data = await getCertificateBundle(req.params.transactionId, {
      userId: req.user.id,
      audience: 'owner'
    })

    return successResponse(res, {
      message: 'تم جلب بيانات الشهادة بنجاح',
      data
    })
  } catch (err) {
    return handleCertificateError(res, err)
  }
}

async function uploadFinalDocumentController (req, res) {
  try {
    let qrPayloadSnapshot = null

    if (req.body?.qr_payload) {
      try {
        qrPayloadSnapshot = JSON.parse(req.body.qr_payload)
      } catch {
        qrPayloadSnapshot = null
      }
    }

    const data = await saveFinalDocument({
      transactionId: req.params.transactionId,
      userId: req.user.id,
      file: req.file,
      qrPayloadSnapshot
    })

    return successResponse(res, {
      message: 'تم حفظ الوثيقة النهائية بنجاح',
      data
    })
  } catch (err) {
    return handleCertificateError(res, err)
  }
}

async function getFinalDocumentController (req, res) {
  try {
    const data = await getFinalDocument(req.params.transactionId, {
      userId: req.user.id
    })

    return successResponse(res, {
      message: 'تم جلب الوثيقة النهائية بنجاح',
      data
    })
  } catch (err) {
    return handleCertificateError(res, err)
  }
}

module.exports = {
  getCertificateController,
  uploadFinalDocumentController,
  getFinalDocumentController
}
