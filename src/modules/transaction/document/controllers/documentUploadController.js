'use strict'

const asyncHandler = require('../../../../core/middleware/asyncHandler')
const ApiResponder = require('../../../../core/utils/apiResponder')
const {
  buildTransactionFileUploadResult
} = require('../services/documentUploadService')

function handleUploadError (res, err) {
  const statusCode =
    err.code === 'UPLOAD_QUOTA_EXCEEDED'
      ? 429
      : err.code === 'FILE_REQUIRED' || err.code === 'VALIDATION_ERROR'
        ? 400
        : err.statusCode || 500

  return ApiResponder.error(res, {
    message: err.message || 'فشل رفع الملف',
    statusCode,
    error: err.code || 'UPLOAD_ERROR',
    data: null
  })
}

const uploadTransactionFileController = asyncHandler(async (req, res) => {
  try {
    const data = await buildTransactionFileUploadResult({
      file: req.file,
      key: req.body?.key,
      typeDocId: req.body?.type_doc_id ?? req.body?.type_Doc_id,
      userId: req.user.id
    })

    return ApiResponder.okResponse(res, data, 'تم رفع الملف بنجاح')
  } catch (err) {
    return handleUploadError(res, err)
  }
})

module.exports = {
  uploadTransactionFileController
}
