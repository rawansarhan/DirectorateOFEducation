'use strict'

const asyncHandler = require('../../../core/middleware/asyncHandler')
const { sendOk } = require('../../../core/utils/controllerResponse')
const {
  createStageConfigService,
  getConfig_json
} = require('../services/stageConfigService')

const createStageConfig = asyncHandler(async (req, res) => {
  const result = await createStageConfigService(req.body)
  return sendOk(
    res,
    result.data,
    result.message || 'تم إعداد المراحل بنجاح'
  )
})

const getJsonProcess = asyncHandler(async (req, res) => {
  const data = await getConfig_json(req.params.id)
  return sendOk(res, data, 'تم جلب إعدادات العملية بنجاح')
})

module.exports = {
  createStageConfig,
  getJsonProcess
}
