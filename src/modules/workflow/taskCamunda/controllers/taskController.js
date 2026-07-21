const completeTaskService = require('../services/completeTaskService')
const getAllTasksService = require('../services/getAllTasksService')
const getTaskStatsService = require('../services/getTaskStatsService')
const { parseDepartmentIds, parseDateRange } = getAllTasksService
const getTaskDetailsService = require('../services/getTaskDetailsService')
const { startWorkflow } = require('../services/startWorkflowService')
const { createSigningChallenge } = require('../services/transactionSigningService')
const { getClientMeta } = require('../../../../core/security/securityConfig')
const {
  sendWorkflowSuccess,
  sendWorkflowError,
  workflowValidationError
} = require('../../../../core/utils/workflowResponseHelper')
const { validateCompleteTaskPayload } = require('../../schemas/completeTaskSchema')
const { validateSigningChallengePayload } = require('../../schemas/signingChallengeSchema')
const { parseCursorPaginationQuery } = require('../../../../core/utils/pagination')
const { getCertificateBundle } = require('../../../transaction/public')

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

    return handleWorkflowError(res, error, error.statusCode || 400)
  }
}

async function getAllTasksController (req, res) {
  try {
    const { limit, cursor } = parseCursorPaginationQuery(req.query)
    const status = String(req.query.status || 'all').trim()
    getAllTasksService.normalizeTaskListStatus(status)

    const result = await getAllTasksService.getAllTasks({
      userId: req.user.id,
      cursor,
      limit,
      status
    })

    return sendWorkflowSuccess(res, result.data, result.message)
  } catch (error) {
    const status = error.code === 'VALIDATION_ERROR' ? 400 : 500
    return handleWorkflowError(res, error, status)
  }
}

async function getCompletedByDepartmentController (req, res) {
  try {
    const { limit, cursor } = parseCursorPaginationQuery(req.query)
    const departmentIds = parseDepartmentIds({ query: req.query })
    const { fromDate, toDate } = parseDateRange({ query: req.query })

    const result = await getAllTasksService.getCompletedByDepartment({
      userId: req.user.id,
      departmentIds,
      fromDate,
      toDate,
      cursor,
      limit
    })

    return sendWorkflowSuccess(res, result.data, result.message)
  } catch (error) {
    const status = error.code === 'FORBIDDEN' ? 403 : error.code === 'VALIDATION_ERROR' ? 400 : 500
    return handleWorkflowError(res, error, status)
  }
}

async function getRejectedByDepartmentController (req, res) {
  try {
    const { limit, cursor } = parseCursorPaginationQuery(req.query)
    const departmentIds = parseDepartmentIds({ query: req.query })
    const { fromDate, toDate } = parseDateRange({ query: req.query })

    const result = await getAllTasksService.getRejectedByDepartment({
      userId: req.user.id,
      departmentIds,
      fromDate,
      toDate,
      cursor,
      limit
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

async function getEmployeeCertificateController (req, res) {
  try {
    const data = await getCertificateBundle(req.params.transactionId)

    return sendWorkflowSuccess(res, data, 'تم جلب بيانات الشهادة بنجاح')
  } catch (error) {
    const status =
      error.code === 'TRANSACTION_NOT_FOUND' || error.code === 'NOT_FOUND'
        ? 404
        : 400

    return handleWorkflowError(res, error, status)
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

async function pickupTaskController (req, res) {
  try {
    const result = await getTaskDetailsService.pickupTask({
      taskId: req.params.taskId,
      userId: req.user.id
    })

    return sendWorkflowSuccess(res, result.data, result.message)
  } catch (error) {
    const status = error.code === 'TASK_LOCKED_BY_ANOTHER' ? 409 : 400
    return handleWorkflowError(res, error, status)
  }
}

async function releaseTaskController (req, res) {
  try {
    const result = await getTaskDetailsService.releaseTask({
      taskId: req.params.taskId,
      userId: req.user.id
    })

    return sendWorkflowSuccess(res, result.data, result.message)
  } catch (error) {
    const status =
      error.code === 'TASK_LOCK_NOT_OWNER' || error.code === 'FORBIDDEN'
        ? 403
        : error.code === 'TASK_LOCK_NOT_HELD'
          ? 409
          : 400

    return handleWorkflowError(res, error, status)
  }
}

module.exports = {
  startWorkflowController,
  createSigningChallengeController,
  completeTaskController,
  getAllTasksController,
  getCompletedByDepartmentController,
  getRejectedByDepartmentController,
  getCompletedLastMonthStatsController,
  getRejectedLastMonthStatsController,
  getActiveStatsController,
  getEmployeeCertificateController,
  getTaskDetailsController,
  pickupTaskController,
  releaseTaskController
}
