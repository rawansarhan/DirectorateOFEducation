'use strict'

const asyncHandler = require('../../../core/middleware/asyncHandler')
const ApiResponder = require('../../../core/utils/apiResponder')

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

    return ApiResponder.okResponse(res, {
      success: true,

      process,

      stages: setup || []
    }, 'تم إنشاء العملية بنجاح')
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
})

///// ============================== get AUTH processes ====================================

const getAuthProcessesController = asyncHandler(async (req, res) => {
  try {
    const typeTransID = req.params.id
    const userId = req.user.id
    const result = await getAuthProcesses(typeTransID, userId)

    return ApiResponder.okResponse(res, result.data, result.message)
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
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

  return ApiResponder.okResponse(res, result, 'تم جلب البيانات بنجاح')
    } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
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

  return ApiResponder.okResponse(res, result, 'تم تنفيذ المراجعة بنجاح')
    } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
})
///////////////////////////////////////////////////
const processById = asyncHandler(async (req, res) => {
  try {
    const result = await getProcessByIdService(req.params.id)

    return ApiResponder.okResponse(res, result, 'تم جلب البيانات بنجاح')

  } catch (err) {
    return ApiResponder.notFoundResponse(res, err.message)
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
