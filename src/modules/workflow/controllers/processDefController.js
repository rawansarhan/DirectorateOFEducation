'use strict'

const asyncHandler = require('../../../core/middleware/asyncHandler')

const {
  createProcessDefinitionService,
  setupProcessAfterCreation,
  getAuthProcesses,
  getCitizenAuthProcessesByType,
  getProcessDetailsWithValidation,
  reviewProcess
} = require('../services/processDefinitionService')
const {
  buildAuthProcessListResponse
} = require('../helpers/authProcessListResponse')

///// ============================== create new Process Definition ====================================

const LOG_PREFIX = '[ProcessDefinitionController]'

const createProcessDefinition = asyncHandler(async (req, res) => {
  try {
    const isComplaint = req.body.is_complaint === true ||
      req.body.is_complaint === 'true' ||
      req.body.is_complaint === '1'

    console.log(`${LOG_PREFIX} POST /create is_complaint=${isComplaint}`)

    const data = {
      name: req.body.name,
      code: req.body.code,
      is_complaint: isComplaint,
      type_trans_id: isComplaint ? null : Number(req.body.type_trans_id),
      organization_id: req.body.organization_id
        ? Number(req.body.organization_id)
        : undefined,
      priority: Number(req.body.priority),
      start_date: req.body.start_date,
      end_date: req.body.end_date,
      filePath: req.file?.path
    }

    if (!data.filePath) throw new Error('ملف BPMN مطلوب !')

    const process = await createProcessDefinitionService(data)
    const processID = process.id
    const setup = await setupProcessAfterCreation(processID)

    console.log(`${LOG_PREFIX} process created id=${processID} stages=${setup?.length ?? 0}`)

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

    return res.status(200).json(buildAuthProcessListResponse(result))
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    })
  }
})

const getCitizenAuthProcessesController = asyncHandler(async (req, res) => {
  try {
    const typeTransID = req.params.typeTransId
    console.log(`${LOG_PREFIX} GET /citizen/type/${typeTransID}`)

    const result = await getCitizenAuthProcessesByType(typeTransID)

    return res.status(200).json(buildAuthProcessListResponse(result))
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
module.exports = {
  createProcessDefinition,
  getAuthProcessesController,
  getCitizenAuthProcessesController,
  getProcessDetails,
  reviewProcessController
}
