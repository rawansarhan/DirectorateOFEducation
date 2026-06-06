'use strict'

const asyncHandler = require('../../../../core/middleware/asyncHandler')
const ApiResponder = require('../../../../core/utils/apiResponder')
const {
  createDocumentTemplateService,
  updateDocumentTemplateService,
  getAllActiveDocumentTemplatesService,
  getOneActiveDocumentTemplateService
} = require('../services/docTempService')

const createDocumentTemplate = asyncHandler(async (req, res) => {
  try {
    const data = {
      ...req.body,
      file_path: req.file
        ? `/uploads/${req.file.filename}`
        : null
    }
    const result = await createDocumentTemplateService(data)
    return ApiResponder.createdResponse(res, result, 'تم انشاء القالب بنجاح')
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
})

const updateDocumentTemplate = asyncHandler(async (req, res) => {
  try {
    const data = {
      ...req.body,
      file_path: req.file?.filename
    }
    const result = await updateDocumentTemplateService(req.params.id, data)
    return ApiResponder.createdResponse(res, result, 'تم تعديل القالب بنجاح')
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
})

const getAllActiveDocumentTemplates = asyncHandler(async (req, res) => {
  try {
    const result = await getAllActiveDocumentTemplatesService()
    return ApiResponder.okResponse(res, result, 'تم جلب القوالب بنجاح')
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
})

const getOneActiveDocumentTemplate = asyncHandler(async (req, res) => {
  try {
    const result = await getOneActiveDocumentTemplateService(req.params.id)
    return ApiResponder.okResponse(res, result, 'تم جلب القالب بنجاح')
  } catch (err) {
    const statusCode = err.statusCode === 404 ? 404 : 400

    if (statusCode === 404) {
      return ApiResponder.notFoundResponse(res, err.message)
    }

    return ApiResponder.badRequestResponse(res, err.message)
  }
})

module.exports = {
  createDocumentTemplate,
  updateDocumentTemplate,
  getAllActiveDocumentTemplates,
  getOneActiveDocumentTemplate
}
