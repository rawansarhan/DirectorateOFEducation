'use strict'

const asyncHandler = require('../../../../core/middleware/asyncHandler')
const ApiResponder = require('../../../../core/utils/apiResponder')
const {
  searchProcessDefinitions
} = require('../services/processSearchService')

const searchProcessDefinitionsController = asyncHandler(async (req, res) => {
  try {
    const result = await searchProcessDefinitions(req.query)
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
  searchProcessDefinitionsController
}
