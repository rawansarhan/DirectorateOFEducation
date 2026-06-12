const completeTaskService = require('../services/completeTaskService')
const getAllTasksService = require('../services/getAllTasksService')
const getTaskStatsService = require('../services/getTaskStatsService')
const { EMPLOYEE_STATUS_FILTERS, parseDepartmentIds, parseDateRange } = getAllTasksService
const getTaskDetailsService = require('../services/getTaskDetailsService')
const { startWorkflow } = require('../services/startWorkflowService')
const { createSigningChallenge } = require('../services/transactionSigningService')
const {
  createDocumentSubmitSigningChallenge,
  completeDocumentSubmit
} = require('../services/documentSubmitService')
const { getClientMeta } = require('../../../../core/security/securityConfig')
const {
  sendWorkflowSuccess,
  sendWorkflowError,
  workflowValidationError
} = require('../../../../core/utils/workflowResponseHelper')
const { validateCompleteTaskPayload } = require('../../schemas/completeTaskSchema')
const { validateSigningChallengePayload } = require('../../schemas/signingChallengeSchema')
const { parsePaginationQuery } = require('../../../../core/utils/pagination')

function handleWorkflowError (res, error, defaultStatus = 400) {
  return sendWorkflowError(res, error, defaultStatus)
}

async function startWorkflowController (req, res) {
  try {
    const { transactionId, processCode } = req.body

    if (!transactionId || !processCode) {
      return sendWorkflowError(
        res,
        workflowValidationError('transactionId و processCode مطلوبان')
      )
    }

    const result = await startWorkflow({ transactionId, processCode })

    return sendWorkflowSuccess(res, result.data, result.message)
  } catch (error) {
    return handleWorkflowError(res, error, 400)
  }
}

async function createSigningChallengeController (req, res) {
  try {
    const { error: validationError, value } =
      validateSigningChallengePayload(req.body || {})

    if (validationError) {
      return sendWorkflowError(res, workflowValidationError(validationError))
    }

    const result = await createSigningChallenge({
      taskId: req.params.taskId,
      userId: req.user.id,
      payload: value,
      clientMeta: getClientMeta(req)
    })

    return sendWorkflowSuccess(res, result, 'تم إنشاء تحدي التوقيع بنجاح')
  } catch (error) {
    return handleWorkflowError(res, error, 400)
  }
}

async function completeTaskController (req, res) {
  try {
    const { error: validationError, value } = validateCompleteTaskPayload(req.body)

    if (validationError) {
      return sendWorkflowError(
        res,
        workflowValidationError(validationError)
      )
    }

    const result = await completeTaskService.completeTask({
      taskId: req.params.taskId,
      userId: req.user.id,
      payload: value,
      clientMeta: getClientMeta(req)
    })

    return sendWorkflowSuccess(res, result.data, result.message)
  } catch (error) {
    if (error.code === 'IDEMPOTENT_REPLAY' && error.result) {
      return sendWorkflowSuccess(
        res,
        error.result.data,
        error.result.message
      )
    }

    return handleWorkflowError(res, error, 400)
  }
}

async function getAllTasksController (req, res) {
  try {
    const { page, limit, offset } = parsePaginationQuery(req.query)
    const status = String(req.query.status || 'active').trim()

    const result = await getAllTasksService.getAllTasks({
      userId: req.user.id,
      page,
      limit,
      offset,
      status
    })

    return sendWorkflowSuccess(res, result.data, result.message)
  } catch (error) {
    return handleWorkflowError(res, error, 500)
  }
}

async function getInProgressTasksController (req, res) {
  try {
    const { page, limit, offset } = parsePaginationQuery(req.query)

    const result = await getAllTasksService.getActiveEmployeeTasks({
      userId: req.user.id,
      page,
      limit,
      offset,
      employeeStatusFilter: EMPLOYEE_STATUS_FILTERS.IN_PROGRESS
    })

    return sendWorkflowSuccess(res, result.data, result.message)
  } catch (error) {
    return handleWorkflowError(res, error, 500)
  }
}

async function getPendingPickupTasksController (req, res) {
  try {
    const { page, limit, offset } = parsePaginationQuery(req.query)

    const result = await getAllTasksService.getActiveEmployeeTasks({
      userId: req.user.id,
      page,
      limit,
      offset,
      employeeStatusFilter: EMPLOYEE_STATUS_FILTERS.PENDING_PICKUP
    })

    return sendWorkflowSuccess(res, result.data, result.message)
  } catch (error) {
    return handleWorkflowError(res, error, 500)
  }
}

async function getCompletedByDepartmentController (req, res) {
  try {
    const { page, limit, offset } = parsePaginationQuery(req.query)
    const departmentIds = parseDepartmentIds({ query: req.query })
    const { fromDate, toDate } = parseDateRange({ query: req.query })

    const result = await getAllTasksService.getCompletedByDepartment({
      userId: req.user.id,
      departmentIds,
      fromDate,
      toDate,
      page,
      limit,
      offset
    })

    return sendWorkflowSuccess(res, result.data, result.message)
  } catch (error) {
    const status = error.code === 'FORBIDDEN' ? 403 : error.code === 'VALIDATION_ERROR' ? 400 : 500
    return handleWorkflowError(res, error, status)
  }
}

async function getRejectedByDepartmentController (req, res) {
  try {
    const { page, limit, offset } = parsePaginationQuery(req.query)
    const departmentIds = parseDepartmentIds({ query: req.query })
    const { fromDate, toDate } = parseDateRange({ query: req.query })

    const result = await getAllTasksService.getRejectedByDepartment({
      userId: req.user.id,
      departmentIds,
      fromDate,
      toDate,
      page,
      limit,
      offset
    })

    return sendWorkflowSuccess(res, result.data, result.message)
  } catch (error) {
    const status = error.code === 'FORBIDDEN' ? 403 : error.code === 'VALIDATION_ERROR' ? 400 : 500
    return handleWorkflowError(res, error, status)
  }
}

async function getCompletedLastMonthStatsController (req, res) {
  try {
    const departmentIds = parseDepartmentIds({ query: req.query })

    const result = await getTaskStatsService.getCompletedLastMonthStats({
      userId: req.user.id,
      departmentIds
    })

    return sendWorkflowSuccess(res, result.data, result.message)
  } catch (error) {
    const status = error.code === 'FORBIDDEN' ? 403 : error.code === 'VALIDATION_ERROR' ? 400 : 500
    return handleWorkflowError(res, error, status)
  }
}

async function getRejectedLastMonthStatsController (req, res) {
  try {
    const departmentIds = parseDepartmentIds({ query: req.query })

    const result = await getTaskStatsService.getRejectedLastMonthStats({
      userId: req.user.id,
      departmentIds
    })

    return sendWorkflowSuccess(res, result.data, result.message)
  } catch (error) {
    const status = error.code === 'FORBIDDEN' ? 403 : error.code === 'VALIDATION_ERROR' ? 400 : 500
    return handleWorkflowError(res, error, status)
  }
}

async function getActiveStatsController (req, res) {
  try {
    const departmentIds = parseDepartmentIds({ query: req.query })

    const result = await getTaskStatsService.getActiveStats({
      userId: req.user.id,
      departmentIds
    })

    return sendWorkflowSuccess(res, result.data, result.message)
  } catch (error) {
    const status = error.code === 'FORBIDDEN' ? 403 : error.code === 'VALIDATION_ERROR' ? 400 : 500
    return handleWorkflowError(res, error, status)
  }
}

async function createDocumentSubmitSigningChallengeController (req, res) {
  try {
    const result = await createDocumentSubmitSigningChallenge({
      taskId: req.params.taskId,
      userId: req.user.id,
      payload: req.body || {},
      clientMeta: getClientMeta(req)
    })

    return sendWorkflowSuccess(res, result.data, result.message)
  } catch (error) {
    return handleWorkflowError(res, error, 400)
  }
}

async function completeDocumentSubmitController (req, res) {
  try {
    const result = await completeDocumentSubmit({
      taskId: req.params.taskId,
      userId: req.user.id,
      payload: req.body || {},
      clientMeta: getClientMeta(req)
    })

    return sendWorkflowSuccess(res, result.data, result.message)
  } catch (error) {
    if (error.code === 'IDEMPOTENT_REPLAY' && error.result) {
      return sendWorkflowSuccess(
        res,
        error.result.data,
        error.result.message
      )
    }

    return handleWorkflowError(res, error, 500)
  }
}

async function getTaskDetailsController (req, res) {
  try {
    const result = await getTaskDetailsService.getTaskDetails({
      taskId: req.params.taskId,
      userId: req.user.id
    })

    return sendWorkflowSuccess(res, result.data, result.message)
  } catch (error) {
    return handleWorkflowError(res, error, 400)
  }
}

module.exports = {
  startWorkflowController,
  createSigningChallengeController,
  createDocumentSubmitSigningChallengeController,
  completeDocumentSubmitController,
  completeTaskController,
  getAllTasksController,
  getInProgressTasksController,
  getPendingPickupTasksController,
  getCompletedByDepartmentController,
  getRejectedByDepartmentController,
  getCompletedLastMonthStatsController,
  getRejectedLastMonthStatsController,
  getActiveStatsController,
  getTaskDetailsController
}
