'use strict'

const asyncHandler = require('../../../../core/middleware/asyncHandler')
const ApiResponder = require('../../../../core/utils/apiResponder')

const {
  getProcessByIdService
} = require('../services/processInternalService')

const processById = asyncHandler(async (req, res) => {
  try {
    const result = await getProcessByIdService(req.params.id)

    return ApiResponder.okResponse(res, result, 'تم جلب البيانات بنجاح')

  } catch (err) {
    return ApiResponder.notFoundResponse(res, err.message)
  }
})


module.exports = {
  processById
}