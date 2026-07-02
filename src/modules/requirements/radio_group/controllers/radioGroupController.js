'use strict'

const asyncHandler = require('../../../../core/middleware/asyncHandler')
const ApiResponder = require('../../../../core/utils/apiResponder')
const {
  createRadioGroupService,
  getAllRadioGroupsService,
  getRadioGroupByIdService
} = require('../services/radioGroupService')

const createRadioGroup = asyncHandler(async (req, res) => {
  try {
    const data = await createRadioGroupService(req.body)
    return ApiResponder.createdResponse(
      res,
      data,
      'تم إنشاء مجموعة الاختيار بنجاح'
    )
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
})

const getAllRadioGroups = asyncHandler(async (req, res) => {
  try {
    const data = await getAllRadioGroupsService()
    return ApiResponder.okResponse(res, data, 'تم جلب مجموعات الاختيار بنجاح')
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
})

const getRadioGroupById = asyncHandler(async (req, res) => {
  try {
    const data = await getRadioGroupByIdService(req.params.id)
    return ApiResponder.okResponse(res, data, 'تم جلب مجموعة الاختيار بنجاح')
  } catch (err) {
    const statusCode = err.statusCode === 404 ? 404 : 400

    if (statusCode === 404) {
      return ApiResponder.notFoundResponse(res, err.message)
    }

    return ApiResponder.badRequestResponse(res, err.message)
  }
})

module.exports = {
  createRadioGroup,
  getAllRadioGroups,
  getRadioGroupById
}
