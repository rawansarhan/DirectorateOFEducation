'use strict'

const asyncHandler = require('../../../../core/middleware/asyncHandler')
const ApiResponder = require('../../../../core/utils/apiResponder')
const {
  createFilePickerService,
  getAllFilePickersService,
  getFilePickerByIdService
} = require('../services/filePickerService')

const createFilePicker = asyncHandler(async (req, res) => {
  try {
    const data = await createFilePickerService(req.body)
    return ApiResponder.createdResponse(
      res,
      data,
      'تم إنشاء منتقي الملفات بنجاح'
    )
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
})

const getAllFilePickers = asyncHandler(async (req, res) => {
  try {
    const result = await getAllFilePickersService(req.query)
    return ApiResponder.okResponse(res, result, 'تم جلب منتقيات الملفات بنجاح')
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
})

const getFilePickerById = asyncHandler(async (req, res) => {
  try {
    const data = await getFilePickerByIdService(req.params.id)
    return ApiResponder.okResponse(res, data, 'تم جلب منتقي الملفات بنجاح')
  } catch (err) {
    const statusCode = err.statusCode === 404 ? 404 : 400

    if (statusCode === 404) {
      return ApiResponder.notFoundResponse(res, err.message)
    }

    return ApiResponder.badRequestResponse(res, err.message)
  }
})

module.exports = {
  createFilePicker,
  getAllFilePickers,
  getFilePickerById
}
