'use strict'

const asyncHandler = require('../../../core/middleware/asyncHandler')
const {
  createStageConfigService,
  getConfig_json
} = require('../services/stageConfigService')

///// ============================== create stage configs (bulk) ====================================

const createStageConfig = asyncHandler(async (req, res) => {
  try {
    const data = req.body

    const result = await createStageConfigService(data)

    return res.status(200).json({
      message: 'تم إعداد المراحل بنجاح !',
      data: result
    })
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    })
  }
})

// ======================= get all config_json for process =========================

const getJsonProcess = asyncHandler(async (req, res) => {
  try {
    const processID = req.params.id // ✅ التصحيح

    const result = await getConfig_json(processID)

    return res.status(200).json({
      message: result.message,
      data: result.data
    })
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    })
  }
})
module.exports = {
  createStageConfig,
  getJsonProcess
}
