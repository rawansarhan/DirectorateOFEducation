'use strict'

const asyncHandler = require('../../../core/middleware/asyncHandler')
const ApiResponder = require('../../../core/utils/apiResponder')
const {
  createStageConfigService,
  getConfig_json
} = require('../services/stageConfigService')

const createStageConfig = asyncHandler(async (req, res) => {
  try {
    const result = await createStageConfigService(req.body)
    return ApiResponder.okResponse(res, result, 'تم إعداد المراحل بنجاح !')
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
})

const getJsonProcess = asyncHandler(async (req, res) => {
  try {
    const processID = req.params.id
    const result = await getConfig_json(processID)
    return ApiResponder.okResponse(res, result.data, result.message)
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
})

module.exports = {
  createStageConfig,
  getJsonProcess
}
