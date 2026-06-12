'use strict'

const asyncHandler = require('../../../../core/middleware/asyncHandler')
const ApiResponder = require('../../../../core/utils/apiResponder')
const {
  createDocumentTemplateService,
  updateDocumentTemplateService,
  getAllActiveDocumentTemplatesService,
  getOneActiveDocumentTemplateService
} = require('../services/docTempService')

function handleDocumentTemplateError (res, err) {
  const statusCode =
    err.code === 'TEMPLATE_NOT_FOUND' || err.code === 'TYPE_DOC_NOT_FOUND'
      ? 404
      : err.code === 'VALIDATION_ERROR' ||
        err.code === 'FILE_REQUIRED' ||
        err.code === 'TYPE_DOC_INACTIVE'
        ? 400
        : 500

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
      ...req.body,
      file_path: req.file
        ? `/uploads/${req.file.filename}`
        : null
    }

    const result = await createDocumentTemplateService(data)

    return ApiResponder.okResponse(res, result, 'تم إنشاء قالب الوثيقة بنجاح')
  } catch (err) {
    return handleDocumentTemplateError(res, err)
  }
})

const updateDocumentTemplate = asyncHandler(async (req, res) => {
  try {
    const data = {
      ...req.body,
      file_path: req.file
        ? `/uploads/${req.file.filename}`
        : undefined
    }

    const result = await updateDocumentTemplateService(req.params.id, data)

    return ApiResponder.okResponse(res, result, 'تم تعديل قالب الوثيقة بنجاح')
  } catch (err) {
    return handleDocumentTemplateError(res, err)
  }
})

const getAllActiveDocumentTemplates = asyncHandler(async (req, res) => {
  try {
    const result = await getAllActiveDocumentTemplatesService()
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

module.exports = {
  createDocumentTemplate,
  updateDocumentTemplate,
  getAllActiveDocumentTemplates,
  getOneActiveDocumentTemplate
}
