const { createStageTransitionService } = require('../services/stageTransitionService')

async function createStageTransitionController(req, res) {
  try {
    const transition = await createStageTransitionService(req.body)

    return res.status(201).json({
      success: true,
      message: 'تم إنشاء الانتقال بنجاح',
      data: transition
    })

  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    })
  }
}

module.exports = { createStageTransitionController }