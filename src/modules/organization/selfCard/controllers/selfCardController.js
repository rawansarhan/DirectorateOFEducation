'use strict'

const asyncHandler = require('../../../../core/middleware/asyncHandler')
const ApiResponder = require('../../../../core/utils/apiResponder')
const {
  getSelfCardById,
  searchSelfCardsService,
  createSelfCardService
} = require('../services/employeeSelfCardService')

const searchSelfCards = asyncHandler(async (req, res) => {
  try {
    const result = await searchSelfCardsService(req.query)
    return ApiResponder.okResponse(res, result, 'تم جلب نتائج البحث')
  } catch (err) {
    return ApiResponder.error(res, {
      message: err.message,
      statusCode: err.statusCode || 400,
      error: err.code || undefined
    })
  }
})

const getSelfCard = asyncHandler(async (req, res) => {
  try {
    const result = await getSelfCardById(req.params.id)
    return ApiResponder.okResponse(res, result.data, result.message)
  } catch (err) {
    return ApiResponder.error(res, {
      message: err.message,
      statusCode: err.statusCode || 400,
      error: err.code || undefined
    })
  }
})

const createSelfCard = asyncHandler(async (req, res) => {
  try {
    const result = await createSelfCardService(req.body)
    return ApiResponder.createdResponse(res, result.data, result.message)
  } catch (err) {
    return ApiResponder.error(res, {
      message: err.message,
      statusCode: err.statusCode || 400,
      error: err.code || undefined
    })
  }
})

module.exports = {
  searchSelfCards,
  getSelfCard,
  createSelfCard
}
