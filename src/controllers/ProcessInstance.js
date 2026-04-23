const {getCurrentStageData} = require('../repositories/ProcessInsRepo')
const {runStage} = require('../engine/stageRunner')

const runStageController = asyncHandler(async (req, res) => {
  const { processInstanceId } = req.params
  const inputData = req.body

  const instance = await getCurrentStageData(processInstanceId)

  const result = await runStage(instance, inputData)

  res.json({
    message: 'تم تنفيذ المرحلة',
    next: result
  })
})


module.exports = { runStageController }
