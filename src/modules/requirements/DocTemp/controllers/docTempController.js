'use strict'

const asyncHandler = require('../../../../core/middleware/asyncHandler')
const ApiResponder = require('../../../../core/utils/apiResponder')
const {
  createDocumentTemplateService,
  updateDocumentTemplateService,
  getAllActiveDocumentTemplatesService,
  getOneActiveDocumentTemplateService,
  extractTemplateFieldsFromUploadService,
  extractTemplateFieldsByIdService
} = require('../services/docTempService')

function handleDocumentTemplateError (res, err) {
  const statusCode =
    err.statusCode ||
    (err.code === 'UPLOAD_QUOTA_EXCEEDED'
      ? 429
      : err.code === 'TEMPLATE_NOT_FOUND' || err.code === 'TYPE_DOC_NOT_FOUND'
        ? 404
        : err.code === 'UNAUTHORIZED_FILE'
          ? 403
          : err.code === 'VALIDATION_ERROR' ||
            err.code === 'FILE_REQUIRED' ||
            err.code === 'TYPE_DOC_INACTIVE'
            ? 400
            : 500)

  return ApiResponder.error(res, {
    message: err.message || 'حدث خطأ أثناء معالجة قالب الوثيقة',
    statusCode,
    error: err.code || 'REQUEST_ERROR',
    data: null
  })
}

const createDocumentTemplate = asyncHandler(async (req, res) => {
  try {
    const data = {
      name: req.body?.name,
      type_doc_id: req.body?.type_doc_id ?? req.body?.TypeDoc_id,
      config_json: req.body?.config_json,
      path: req.body?.path,
      url: req.body?.url
    }

    const result = await createDocumentTemplateService(data, { userId: req.user?.id })

    return ApiResponder.okResponse(res, result, 'تم إنشاء قالب الوثيقة بنجاح')
  } catch (err) {
    return handleDocumentTemplateError(res, err)
  }
})

const updateDocumentTemplate = asyncHandler(async (req, res) => {
  try {
    const result = await updateDocumentTemplateService(req.params.id, req.body)

    return ApiResponder.okResponse(res, result, 'تم تعديل قالب الوثيقة بنجاح')
  } catch (err) {
    return handleDocumentTemplateError(res, err)
  }
})

const getAllActiveDocumentTemplates = asyncHandler(async (req, res) => {
  try {
    const result = await getAllActiveDocumentTemplatesService(req.query)
    return ApiResponder.okResponse(res, result, 'تم جلب القوالب بنجاح')
  } catch (err) {
    return handleDocumentTemplateError(res, err)
  }
})

const getOneActiveDocumentTemplate = asyncHandler(async (req, res) => {
  try {
    const result = await getOneActiveDocumentTemplateService(req.params.id)
    return ApiResponder.okResponse(res, result, 'تم جلب القالب بنجاح')
  } catch (err) {
    return handleDocumentTemplateError(res, err)
  }
})

const extractTemplateFieldsFromUpload = asyncHandler(async (req, res) => {
  try {
    const result = await extractTemplateFieldsFromUploadService(req.file, {
      userId: req.user?.id,
      key: req.body?.key
    })
    return ApiResponder.okResponse(
      res,
      result,
      'تم استخراج أسماء إفراغات القالب بنجاح'
    )
  } catch (err) {
    return handleDocumentTemplateError(res, err)
  }
})

const extractTemplateFieldsById = asyncHandler(async (req, res) => {
  try {
    const result = await extractTemplateFieldsByIdService(req.params.id)
    return ApiResponder.okResponse(
      res,
      result,
      'تم استخراج أسماء إفراغات القالب بنجاح'
    )
  } catch (err) {
    return handleDocumentTemplateError(res, err)
  }
})

module.exports = {
  createDocumentTemplate,
  updateDocumentTemplate,
  getAllActiveDocumentTemplates,
  getOneActiveDocumentTemplate,
  extractTemplateFieldsFromUpload,
  extractTemplateFieldsById
}
