'use strict'

const asyncHandler = require('../../../core/middleware/asyncHandler')
const ApiResponder = require('../../../core/utils/apiResponder')
const { sendOk } = require('../../../core/utils/controllerResponse')
const {
  createStageConfigService,
  getConfig_json
} = require('../services/stageConfigService')

///// ============================== create stage configs (bulk) ====================================

const createStageConfig = asyncHandler(async (req, res) => {
  try {
    const data = req.body

    const result = await createStageConfigService(data)

    return ApiResponder.okResponse(res, result, 'تم إعداد المراحل بنجاح !')
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
  const result = await createStageConfigService(req.body)
  return sendOk(
    res,
    result.data,
    result.message || 'تم إعداد المراحل بنجاح'
  )
})

// ======================= get all config_json for process =========================

const getJsonProcess = asyncHandler(async (req, res) => {
  try {
    const processID = req.params.id // ✅ التصحيح

    const result = await getConfig_json(processID)

    return ApiResponder.okResponse(res, result.data, result.message)
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
  const data = await getConfig_json(req.params.id)
  return sendOk(res, data, 'تم جلب إعدادات العملية بنجاح')
})
module.exports = {
  createStageConfig,
  getJsonProcess
}
