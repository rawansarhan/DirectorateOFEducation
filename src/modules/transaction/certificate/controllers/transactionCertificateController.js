'use strict'

const {
  getCertificateBundle,
  getFinalDocument,
  getMyFinalDocument,
  deleteFinalDocument,
  listMyFinalDocuments,
  listTransactionSourceDocuments,
  parseIdList,
  parseFileOrder
} = require('../services/transactionCertificateService')
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

async function getMyFinalDocumentController (req, res) {
  try {
    const data = await getMyFinalDocument(
      req.params.transactionId,
      req.user.id
    )

    return successResponse(res, {
      message: 'تم جلب الوثيقة النهائية بنجاح',
      data
    })
  } catch (err) {
    return handleCertificateError(res, err)
  }
}

async function getFinalDocumentController (req, res) {
  try {
    const hasFileOrder = Object.prototype.hasOwnProperty.call(
      req.query,
      'file_order'
    )
    const hasInstanceKey = Object.prototype.hasOwnProperty.call(
      req.query,
      'document_instance_ids'
    )
    const hasSignatureKey = Object.prototype.hasOwnProperty.call(
      req.query,
      'document_signature_ids'
    )

    const data = await getFinalDocument(req.params.transactionId, {
      userId: req.user?.id ?? null,
      fileOrder: hasFileOrder
        ? parseFileOrder(req.query.file_order)
        : undefined,
      documentInstanceIds: hasInstanceKey
        ? parseIdList(req.query.document_instance_ids)
        : undefined,
      documentSignatureIds: hasSignatureKey
        ? parseIdList(req.query.document_signature_ids)
        : undefined
    })

    return successResponse(res, {
      message: 'تم جلب الوثيقة النهائية بنجاح',
      data
    })
  } catch (err) {
    return handleCertificateError(res, err)
  }
}

async function listSourceDocumentsController (req, res) {
  try {
    const data = await listTransactionSourceDocuments(req.params.transactionId)

    return successResponse(res, {
      message: 'تم جلب مستندات المعاملة بنجاح',
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
  getMyFinalDocumentController,
  getFinalDocumentController,
  listSourceDocumentsController,
  deleteFinalDocumentController,
  listMyFinalDocumentsController
}
