'use strict'

const asyncHandler = require('../../../core/middleware/asyncHandler')

const {
  createProcessDefinitionService,
  setupProcessAfterCreation,
  getAuthProcesses,
  getProcessDetailsWithValidation,
  reviewProcess,
  getProcessByIdService
} = require('../services/processDefinitionService')

///// ============================== create new Process Definition ====================================

const createProcessDefinition = asyncHandler(async (req, res) => {
  try {
    const data = {
      name: req.body.name,
      code: req.body.code,
      type_trans_id: req.body.type_trans_id,
      organization_id: req.body.organization_id,
      priority: req.body.priority,
      start_date: req.body.start_date,
      end_date: req.body.end_date,
      filePath: req.file?.path
    }

    if (!data.filePath) throw new Error('ملف BPMN مطلوب !')

    const process = await createProcessDefinitionService(data)
    const processID = process.id
    console.log('rawan')
    const setup = await setupProcessAfterCreation(processID)

    return res.status(200).json({
      message: 'تم إنشاء العملية بنجاح',
      data: {
        success: true,

        process,

        stages: setup || []
      }
    })
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    })
  }
})

///// ============================== get AUTH processes ====================================

const getAuthProcessesController = asyncHandler(async (req, res) => {
  try {
    const typeTransID = req.params.id
    const userId = req.user.id
    const result = await getAuthProcesses(typeTransID, userId)

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
// =========================================
// GET PROCESS DETAILS + VALIDATION
// =========================================
const getProcessDetails = asyncHandler(async (req, res) => {
  try {
  const processId = req.params.id

  const result =
    await getProcessDetailsWithValidation(processId)

  return res.status(200).json({
    success: true,
    ...result
  })
    } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    })
  }
})

// =========================================
// REVIEW PROCESS (APPROVE / REJECT)
// =========================================
const reviewProcessController = asyncHandler(async (req, res) => {
  try {
  const processId = req.params.id
  const { decision } = req.body

  const result =
    await reviewProcess(processId, decision)

  return res.status(200).json({
    success: true,
    ...result
  })
    } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    })
  }
})
///////////////////////////////////////////////////
const processById = asyncHandler(async (req, res) => {
  try {
    const result = await getProcessByIdService(req.params.id)

    return res.status(200).json({
      success: true,
      message: 'تم جلب البيانات بنجاح',
      data: result
    })

  } catch (err) {
    return res.status(404).json({
      success: false,
      message: err.message
    })
  }
})

//////////////////////////////////////////////////

module.exports = {
  createProcessDefinition,
  getAuthProcessesController,
  getProcessDetails,
  reviewProcessController,
  processById
}
