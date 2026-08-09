'use strict'

const asyncHandler = require('../../../../core/middleware/asyncHandler')
const ApiResponder = require('../../../../core/utils/apiResponder')
const { searchStructure } = require('../services/structureSearchService')

const searchStructureController = asyncHandler(async (req, res) => {
  try {
    const result = await searchStructure(req.query)
    return ApiResponder.okResponse(res, result.data, result.message)
  } catch (err) {
    return ApiResponder.error(res, {
      message: err.message,
      statusCode: err.statusCode || 400,
      error: err.code || 'REQUEST_ERROR'
    })
  }
})

module.exports = {
  searchStructureController
}
