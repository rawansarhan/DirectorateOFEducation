'use strict'

const asyncHandler = require('../../../../core/middleware/asyncHandler')
const ApiResponder = require('../../../../core/utils/apiResponder')
const {
  createTextFieldService,
  getAllTextFieldsService,
  getTextFieldByIdService
} = require('../services/textFieldService')

const createTextField = asyncHandler(async (req, res) => {
  try {
    const data = await createTextFieldService(req.body)
    return ApiResponder.createdResponse(
      res,
      data,
      'تم إنشاء حقل النص بنجاح'
    )
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
})

const getAllTextFields = asyncHandler(async (req, res) => {
  try {
    const data = await getAllTextFieldsService()
    return ApiResponder.okResponse(res, data, 'تم جلب حقول النص بنجاح')
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
})

const getTextFieldById = asyncHandler(async (req, res) => {
  try {
    const data = await getTextFieldByIdService(req.params.id)
    return ApiResponder.okResponse(res, data, 'تم جلب حقل النص بنجاح')
  } catch (err) {
    const statusCode = err.statusCode === 404 ? 404 : 400

    if (statusCode === 404) {
      return ApiResponder.notFoundResponse(res, err.message)
    }

    return ApiResponder.badRequestResponse(res, err.message)
  }
})

module.exports = {
  createTextField,
  getAllTextFields,
  getTextFieldById
}
