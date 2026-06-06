'use strict'

const asyncHandler = require('../../../../core/middleware/asyncHandler')
const ApiResponder = require('../../../../core/utils/apiResponder')
const {
  createCheckListService,
  getAllCheckListsService,
  getCheckListByIdService
} = require('../services/checkListService')

const createCheckList = asyncHandler(async (req, res) => {
  try {
    const data = await createCheckListService(req.body)
    return ApiResponder.createdResponse(
      res,
      data,
      'تم إنشاء قائمة الاختيار بنجاح'
    )
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
})

const getAllCheckLists = asyncHandler(async (req, res) => {
  try {
    const data = await getAllCheckListsService()
    return ApiResponder.okResponse(res, data, 'تم جلب قوائم الاختيار بنجاح')
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
})

const getCheckListById = asyncHandler(async (req, res) => {
  try {
    const data = await getCheckListByIdService(req.params.id)
    return ApiResponder.okResponse(res, data, 'تم جلب قائمة الاختيار بنجاح')
  } catch (err) {
    const statusCode = err.statusCode === 404 ? 404 : 400

    if (statusCode === 404) {
      return ApiResponder.notFoundResponse(res, err.message)
    }

    return ApiResponder.badRequestResponse(res, err.message)
  }
})

module.exports = {
  createCheckList,
  getAllCheckLists,
  getCheckListById
}
