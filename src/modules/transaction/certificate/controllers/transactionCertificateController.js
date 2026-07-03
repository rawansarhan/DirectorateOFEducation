'use strict'

const {
  getCertificateBundle,
  saveFinalDocument,
  getFinalDocument
} = require('../services/transactionCertificateService')
const {
  generateMergedFinalDocument
} = require('../../document/services/finalDocumentBuilderService')
const {
  assessFinalDocumentReadiness
} = require('../../document/services/finalDocumentReadinessService')
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

async function generateFinalDocumentController (req, res) {
  try {
    const force =
      req.query.force === 'true' || req.query.force === '1'

    const data = await generateMergedFinalDocument(req.params.transactionId, {
      userId: req.user.id,
      force
    })

    return successResponse(res, {
      message: data.already_exists
        ? 'تم إنشاء الوثيقة النهائية (final_document) لهذه المعاملة مسبقاً'
        : 'تم توليد الوثيقة النهائية المدمجة بنجاح',
      data
    })
  } catch (err) {
    return handleCertificateError(res, err)
  }
}

async function getFinalDocumentReadinessController (req, res) {
  try {
    const flush =
      req.query.flush === 'true' || req.query.flush === '1'

    const data = await assessFinalDocumentReadiness(req.params.transactionId, {
      userId: req.user.id,
      requireCompleted: true,
      flushGeneratePdf: flush
    })

    return successResponse(res, {
      message: data.ready_for_merge
        ? 'الوثيقة النهائية جاهزة للدمج'
        : 'الوثيقة النهائية غير جاهزة بعد',
      data
    })
  } catch (err) {
    return handleCertificateError(res, err)
  }
}

module.exports = {
  getCertificateController,
  uploadFinalDocumentController,
  getFinalDocumentController,
  generateFinalDocumentController,
  getFinalDocumentReadinessController
}
