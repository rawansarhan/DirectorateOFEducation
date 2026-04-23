const { createStageConfigService } = require('../services/stageConfigService')

async function createStageConfigController(req, res) {
  try {

    const data = req.body

    const config = await createStageConfigService(data)

    return res.status(201).json({
      success: true,
      message: 'تم إنشاء إعداد المرحلة بنجاح',
      data: config
    })

  } catch (error) {

    console.error('ERROR createStageConfigController:', error)

    return res.status(400).json({
      success: false,
      message: error.message || 'حدث خطأ غير متوقع'
    })
  }
}

module.exports = {
  createStageConfigController
}