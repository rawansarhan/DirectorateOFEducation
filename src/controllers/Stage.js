const asyncHandler = require('../middleware/asyncHandler')
const { createStageService } = require('../services/stage')

const createStage = asyncHandler(async (req, res) => {
  const result = await createStageService(req.body)

  res.status(201).json({
    message: 'تم إنشاء المرحلة بنجاح',
    data: result
  })
})

module.exports = { createStage }