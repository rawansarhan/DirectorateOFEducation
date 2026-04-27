const asyncHandler = require('../middleware/asyncHandler')
const { createProcessDefinitionService , deployProcessDefinitionService , startProcessInstanceService} = require('../services/processDefinition')


const createProcessDefinition = asyncHandler(async (req, res) => {
  const result = await createProcessDefinitionService(req.body)

  res.status(201).json({
    message: 'تم إنشاء تعريف المعاملة بنجاح',
    data: result
  })
})



const deployProcessDefinition = asyncHandler(async (req, res) => {
  const { id } = req.params

  const result = await deployProcessDefinitionService(id)

  res.status(200).json({
    message: 'تم نشر العملية (Deploy) بنجاح',
    data: result
  })
})





const startProcessInstance = asyncHandler(async (req, res) => {
  const result = await startProcessInstanceService(req.body)

  res.status(201).json({
    message: 'تم بدء المعاملة بنجاح',
    data: result
  })
})

module.exports = { createProcessDefinition , deployProcessDefinition , startProcessInstance}