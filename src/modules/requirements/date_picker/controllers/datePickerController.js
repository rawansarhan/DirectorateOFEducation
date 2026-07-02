'use strict'

const asyncHandler = require('../../../../core/middleware/asyncHandler')
const ApiResponder = require('../../../../core/utils/apiResponder')
const {
  createDatePickerService,
  getAllDatePickersService,
  getDatePickerByIdService
} = require('../services/datePickerService')

const createDatePicker = asyncHandler(async (req, res) => {
  try {
    const data = await createDatePickerService(req.body)
    return ApiResponder.createdResponse(
      res,
      data,
      'تم إنشاء منتقي التاريخ بنجاح'
    )
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
})

const getAllDatePickers = asyncHandler(async (req, res) => {
  try {
    const result = await getAllDatePickersService(req.query)
    return ApiResponder.okResponse(res, result, 'تم جلب منتقيات التاريخ بنجاح')
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
})

const getDatePickerById = asyncHandler(async (req, res) => {
  try {
    const data = await getDatePickerByIdService(req.params.id)
    return ApiResponder.okResponse(res, data, 'تم جلب منتقي التاريخ بنجاح')
  } catch (err) {
    const statusCode = err.statusCode === 404 ? 404 : 400

    if (statusCode === 404) {
      return ApiResponder.notFoundResponse(res, err.message)
    }

    return ApiResponder.badRequestResponse(res, err.message)
  }
})

module.exports = {
  createDatePicker,
  getAllDatePickers,
  getDatePickerById
}
