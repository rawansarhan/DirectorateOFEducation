'use strict'

const asyncHandler = require('../../../../core/middleware/asyncHandler')
const ApiResponder = require('../../../../core/utils/apiResponder')
const {
  createTypeDocService,
  updateTypeDocService,
  getAllTypeDocsService,
  getTypeDocByIdService
} = require('../services/typeDocService')

function handleTypeDocError (res, err) {
  const statusCode =
    err.code === 'TYPE_DOC_NOT_FOUND'
      ? 404
      : err.code === 'DUPLICATE_NAME'
        ? 409
        : err.code === 'VALIDATION_ERROR'
          ? 400
          : 500

  return ApiResponder.error(res, {
    message: err.message || 'حدث خطأ أثناء معالجة نوع الوثيقة',
    statusCode,
    error: err.code || 'REQUEST_ERROR',
    data: null
  })
}

const createTypeDoc = asyncHandler(async (req, res) => {
  try {
    const result = await createTypeDocService(req.body)
    return ApiResponder.createdResponse(res, result, 'تم إنشاء نوع الوثيقة بنجاح')
  } catch (err) {
    return handleTypeDocError(res, err)
  }
})

const updateTypeDoc = asyncHandler(async (req, res) => {
  try {
    const result = await updateTypeDocService(req.params.id, req.body)
    return ApiResponder.okResponse(res, result, 'تم تحديث نوع الوثيقة بنجاح')
  } catch (err) {
    return handleTypeDocError(res, err)
  }
})

const getAllTypeDocs = asyncHandler(async (req, res) => {
  try {
    const result = await getAllTypeDocsService(req.query)
    return ApiResponder.okResponse(res, result, 'تم جلب أنواع الوثائق بنجاح')
  } catch (err) {
    return handleTypeDocError(res, err)
  }
})

const getTypeDocById = asyncHandler(async (req, res) => {
  try {
    const result = await getTypeDocByIdService(req.params.id)
    return ApiResponder.okResponse(res, result, 'تم جلب نوع الوثيقة بنجاح')
  } catch (err) {
    return handleTypeDocError(res, err)
  }
})

module.exports = {
  createTypeDoc,
  updateTypeDoc,
  getAllTypeDocs,
  getTypeDocById
}
