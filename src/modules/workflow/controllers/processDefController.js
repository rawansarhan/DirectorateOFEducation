'use strict'

const asyncHandler = require('../../../core/middleware/asyncHandler')
const { sendOk, sendControllerError } = require('../../../core/utils/controllerResponse')
const {
  createProcessDefinitionService,
  setupProcessAfterCreation,
  getAuthProcesses,
  getCitizenAuthProcessesByType,
  getProcessDetailsWithValidation,
  reviewProcess
} = require('../services/processDefinitionService')
const { buildAuthProcessListResponse } = require('../helpers/authProcessListResponse')

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

    if (!data.filePath) {
      throw new Error('ملف BPMN مطلوب !')
    }

    const process = await createProcessDefinitionService(data)
    const setup = await setupProcessAfterCreation(process.id)

    console.log(`${LOG_PREFIX} process created id=${process.id} stages=${setup?.length ?? 0}`)

    return sendOk(res, {
      process,
      stages: setup || []
    }, 'تم إنشاء العملية بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
})

const getAuthProcessesController = asyncHandler(async (req, res) => {
  try {
    const result = await getAuthProcesses(req.params.id, req.user.id)
    return sendOk(
      res,
      buildAuthProcessListResponse(result),
      result.message || 'تم جلب العمليات بنجاح'
    )
  } catch (err) {
    return sendControllerError(res, err)
  }
})

const getCitizenAuthProcessesController = asyncHandler(async (req, res) => {
  try {
    console.log(`${LOG_PREFIX} GET /citizen/type/${req.params.typeTransId}`)
    const result = await getCitizenAuthProcessesByType(req.params.typeTransId)
    return sendOk(
      res,
      buildAuthProcessListResponse(result),
      result.message || 'تم جلب العمليات بنجاح'
    )
  } catch (err) {
    return sendControllerError(res, err)
  }
})

const getProcessDetails = asyncHandler(async (req, res) => {
  try {
    const result = await getProcessDetailsWithValidation(req.params.id)
    return sendOk(res, result, 'تم جلب تفاصيل العملية بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
})

const reviewProcessController = asyncHandler(async (req, res) => {
  try {
    const result = await reviewProcess(req.params.id, req.body.decision)
    return sendOk(res, result, 'تمت مراجعة العملية بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
})

module.exports = {
  createProcessDefinition,
  getAuthProcessesController,
  getCitizenAuthProcessesController,
  getProcessDetails,
  reviewProcessController
}
