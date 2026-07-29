'use strict'

const asyncHandler = require('../../../../core/middleware/asyncHandler')
const ApiResponder = require('../../../../core/utils/apiResponder')
const { parsePaginationQuery } = require('../../../../core/utils/pagination')
const {
  createHttpError,
  HTTP_STATUS
} = require('../../../../core/middleware/httpStatusCodes')

const {
  createProcessDefinitionService,
  setupProcessAfterCreation,
  getAuthProcesses,
  getUnapprovedOrInactiveProcesses,
  getProcessesWithMissingStageConfig,
  getProcessesByTypeForAdmin,
  updateProcessActiveStatus,
  getComplaintProcessesForAdmin,
  getAllComplaintProcessesForAdmin,
  getProcessDetailsWithValidation,
  reviewProcess,
  getProcessByIdService
} = require('../services/processDefinitionService')

const {
  getAllProcessDefinitionStatsService
} = require('../services/processDefinitionStatsService')

///// ============================== create new Process Definition ====================================

const createProcessDefinition = asyncHandler(async (req, res) => {
  const isComplaint =
    req.body.is_complaint === true ||
    req.body.is_complaint === 'true'

  const priorityRaw = req.body.priority
  const priority =
    priorityRaw === undefined || priorityRaw === null || priorityRaw === ''
      ? undefined
      : Number(priorityRaw)

  const typeTransRaw = req.body.type_trans_id
  const typeTransId =
    isComplaint
      ? null
      : typeTransRaw === undefined || typeTransRaw === null || typeTransRaw === ''
        ? undefined
        : Number(typeTransRaw)

  const organizationRaw = req.body.organization_id
  const organizationId =
    organizationRaw === undefined || organizationRaw === null || organizationRaw === ''
      ? undefined
      : Number(organizationRaw)

  const data = {
    name: req.body.name,
    is_complaint: isComplaint,
    type_trans_id: typeTransId,
    organization_id: organizationId,
    priority,
    start_date: req.body.start_date,
    end_date: req.body.end_date,
    filePath: req.file?.path
  }

  if (!data.filePath) {
    throw createHttpError(
      'ملف BPMN مطلوب — ارفع الملف في حقل multipart باسم "file"',
      HTTP_STATUS.BAD_REQUEST,
      'VALIDATION_ERROR'
    )
  }

  const process = await createProcessDefinitionService(data)
  const processID = process.id
  const setup = await setupProcessAfterCreation(processID)

  return ApiResponder.okResponse(res, {
    success: true,
    process,
    stages: setup || []
  }, 'تم إنشاء العملية بنجاح')
})

///// ============================== get AUTH processes ====================================

const getAuthProcessesController = asyncHandler(async (req, res) => {
  try {
    const { page, limit, offset } = parsePaginationQuery(req.query)
    const typeTransID = req.params.id
    const userId = req.user.id
    const result = await getAuthProcesses(
      typeTransID,
      userId,
      { page, limit, offset }
    )

    return ApiResponder.okResponse(res, result.data, result.message)
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
})

const getUnapprovedOrInactiveProcessesController = asyncHandler(async (req, res) => {
  try {
    const { page, limit, offset } = parsePaginationQuery(req.query)
    const result = await getUnapprovedOrInactiveProcesses({ page, limit, offset })

    return ApiResponder.okResponse(res, result.data, result.message)
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
})

const getProcessesWithMissingStageConfigController = asyncHandler(async (req, res) => {
  try {
    const { page, limit, offset } = parsePaginationQuery(req.query)
    const result = await getProcessesWithMissingStageConfig({ page, limit, offset })

    return ApiResponder.okResponse(res, result.data, result.message)
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
})

const getProcessesByTypeForAdminController = asyncHandler(async (req, res) => {
  try {
    const { page, limit, offset } = parsePaginationQuery(req.query)
    const result = await getProcessesByTypeForAdmin(
      req.params.id,
      { page, limit, offset }
    )

    return ApiResponder.okResponse(res, result.data, result.message)
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
})

const updateProcessActiveStatusController = asyncHandler(async (req, res) => {
  try {
    const result = await updateProcessActiveStatus(
      req.params.id,
      req.body?.is_active
    )

    return ApiResponder.okResponse(res, result, 'تم تعديل حالة العملية بنجاح')
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
})

const getComplaintProcessesForAdminController = asyncHandler(async (req, res) => {
  try {
    const { page, limit, offset } = parsePaginationQuery(req.query)
    const result = await getComplaintProcessesForAdmin({ page, limit, offset })

    return ApiResponder.okResponse(res, result.data, result.message)
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
})

const getAllComplaintProcessesForAdminController = asyncHandler(async (req, res) => {
  try {
    const { page, limit, offset } = parsePaginationQuery(req.query)
    const result = await getAllComplaintProcessesForAdmin({ page, limit, offset })

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

    return ApiResponder.okResponse(res, result.data, result.message)
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

const getAllProcessDefinitionStatsController = asyncHandler(async (req, res) => {
  try {
    const result = await getAllProcessDefinitionStatsService({ query: req.query })

    return ApiResponder.okResponse(res, result.data, result.message)
  } catch (err) {
    const statusCode = err.code === 'VALIDATION_ERROR' ? 400 : 500
    return ApiResponder.error(res, { message: err.message, statusCode })
  }
})

//////////////////////////////////////////////////

module.exports = {
  createProcessDefinition,
  getAuthProcessesController,
  getUnapprovedOrInactiveProcessesController,
  getProcessesWithMissingStageConfigController,
  getProcessesByTypeForAdminController,
  updateProcessActiveStatusController,
  getComplaintProcessesForAdminController,
  getAllComplaintProcessesForAdminController,
  getProcessDetails,
  reviewProcessController,
  processById,
  getAllProcessDefinitionStatsController
}
