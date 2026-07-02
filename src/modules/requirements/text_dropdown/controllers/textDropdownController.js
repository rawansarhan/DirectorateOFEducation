'use strict'

const asyncHandler = require('../../../../core/middleware/asyncHandler')
const ApiResponder = require('../../../../core/utils/apiResponder')
const {
  createTextDropdownService,
  getAllTextDropdownsService,
  getTextDropdownByIdService
} = require('../services/textDropdownService')

const createTextDropdown = asyncHandler(async (req, res) => {
  try {
    const data = await createTextDropdownService(req.body)
    return ApiResponder.createdResponse(
      res,
      data,
      'تم إنشاء القائمة المنسدلة بنجاح'
    )
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
})

const getAllTextDropdowns = asyncHandler(async (req, res) => {
  try {
    const result = await getAllTextDropdownsService(req.query)
    return ApiResponder.okResponse(res, result, 'تم جلب القوائم المنسدلة بنجاح')
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
})

const getTextDropdownById = asyncHandler(async (req, res) => {
  try {
    const data = await getTextDropdownByIdService(req.params.id)
    return ApiResponder.okResponse(res, data, 'تم جلب القائمة المنسدلة بنجاح')
  } catch (err) {
    const statusCode = err.statusCode === 404 ? 404 : 400

    if (statusCode === 404) {
      return ApiResponder.notFoundResponse(res, err.message)
    }

    return ApiResponder.badRequestResponse(res, err.message)
  }
})

module.exports = {
  createTextDropdown,
  getAllTextDropdowns,
  getTextDropdownById
}
