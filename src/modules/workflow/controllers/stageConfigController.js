'use strict'

const asyncHandler = require('../../../core/middleware/asyncHandler')
const { sendOk, sendControllerError } = require('../../../core/utils/controllerResponse')
const {
  createStageConfigService,
  getConfig_json
} = require('../services/stageConfigService')

const createStageConfig = asyncHandler(async (req, res) => {
  try {
    const result = await createStageConfigService(req.body)
    return sendOk(res, result, 'تم إعداد المراحل بنجاح !')
  } catch (err) {
    return sendControllerError(res, err)
  }
})

const getJsonProcess = asyncHandler(async (req, res) => {
  try {
    const result = await getConfig_json(req.params.id)
    return sendOk(res, result.data, result.message || 'تم جلب الإعدادات بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
})

module.exports = {
  createStageConfig,
  getJsonProcess
}
