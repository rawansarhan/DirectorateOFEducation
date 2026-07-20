'use strict'

const {
  getCertificateBundle,
  saveFinalDocument,
  getFinalDocument
} = require('../services/transactionCertificateService')
const {
  generateMergedFinalDocument
} = require('../services/finalDocumentBuilderService')
const {
  assessFinalDocumentReadiness
} = require('../services/finalDocumentReadinessService')
const {
  toGenerateResultDTO,
  toReadinessDTO,
  parseQrPayloadFromBody
} = require('../mappers/certificateMapper')
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
    const data = await getCertificateBundle(req.params.transactionId)

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
    const data = await saveFinalDocument({
      transactionId: req.params.transactionId,
      userId: req.user.id,
      file: req.file,
      qrPayloadSnapshot: parseQrPayloadFromBody(req.body)
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
      req.query.force === 'true' ||
      req.query.force === '1' ||
      req.body?.force === true ||
      req.body?.force === 'true' ||
      req.body?.force === '1'

    const result = await generateMergedFinalDocument(req.params.transactionId, {
      userId: req.user.id,
      force,
      requireOwner: true
    })

    const data = toGenerateResultDTO(result)

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

    const result = await assessFinalDocumentReadiness(req.params.transactionId, {
      userId: req.user.id,
      requireCompleted: true,
      flushGeneratePdf: flush,
      requireOwner: true
    })

    const data = toReadinessDTO(result)

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
