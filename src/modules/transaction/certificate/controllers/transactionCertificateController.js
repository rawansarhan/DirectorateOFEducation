'use strict'

const {
  getCertificateBundle,
  saveFinalDocument,
  getFinalDocument,
  deleteFinalDocument,
  listMyFinalDocuments
} = require('../services/transactionCertificateService')
const {
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
const { parsePaginationQuery } = require('../../../../core/utils/pagination')

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
      userId: req.user?.id ?? null
    })

    return successResponse(res, {
      message: data?.available === false
        ? 'لا توجد وثيقة نهائية'
        : 'تم جلب الوثيقة النهائية بنجاح',
      data
    })
  } catch (err) {
    return handleCertificateError(res, err)
  }
}

async function deleteFinalDocumentController (req, res) {
  try {
    const data = await deleteFinalDocument(req.params.transactionId)

    return successResponse(res, {
      message: 'تم حذف الوثيقة النهائية بنجاح',
      data
    })
  } catch (err) {
    return handleCertificateError(res, err)
  }
}

async function listMyFinalDocumentsController (req, res) {
  try {
    const pagination = parsePaginationQuery(req.query)
    const data = await listMyFinalDocuments(req.user.id, pagination)

    return successResponse(res, {
      message: 'تم جلب الوثائق النهائية لمعاملاتك بنجاح',
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
  deleteFinalDocumentController,
  listMyFinalDocumentsController
}
