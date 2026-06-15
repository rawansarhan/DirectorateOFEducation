const completeTaskService = require('../services/completeTaskService')
const getAllTasksService = require('../services/getAllTasksService')
const getTaskStatsService = require('../services/getTaskStatsService')
const { EMPLOYEE_STATUS_FILTERS, parseDepartmentIds, parseDateRange} = getAllTasksService
const getTaskDetailsService = require('../services/getTaskDetailsService')
const { startWorkflow } = require('../services/startWorkflowService')
const { createSigningChallenge } = require('../services/transactionSigningService')
const {
  createDocumentSubmitSigningChallenge,
  createDocumentSubmitSigningChallengeByProcess,
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
const {
  getCertificateBundle
} = require('../../../transaction/certificate/services/transactionCertificateService')

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
///////////////////////////////////////////////////////////////////////////////////
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

async function createDocumentSubmitSigningChallengeByProcessController (req, res) {
  try {
    const result = await createDocumentSubmitSigningChallengeByProcess({
      processId: req.params.processId,
      userId: req.user.id,
      payload: req.body || {},
      clientMeta: getClientMeta(req)
    })

    return sendWorkflowSuccess(res, result.data, result.message)
  } catch (error) {
    const status =
      error.code === 'FORBIDDEN' || error.code === 'UNAUTHORIZED'
        ? 403
        : ['PROCESS_NOT_FOUND', 'TRANSACTION_NOT_FOUND'].includes(error.code)
          ? 404
          : 400

    return handleWorkflowError(res, error, status)
  }
}

async function createDocumentSubmitSigningChallengeByTransactionController (req, res) {
  try {
    const result = await createDocumentSubmitSigningChallenge({
      transactionId: req.params.transactionId,
      userId: req.user.id,
      payload: req.body || {},
      clientMeta: getClientMeta(req)
    })

    return sendWorkflowSuccess(res, result.data, result.message)
  } catch (error) {
    const status =
      error.code === 'FORBIDDEN' || error.code === 'UNAUTHORIZED'
        ? 403
        : ['TRANSACTION_NOT_FOUND', 'PROCESS_INSTANCE_NOT_FOUND', 'NO_ACTIVE_TASK'].includes(
          error.code
        )
          ? 404
          : 400

    return handleWorkflowError(res, error, status)
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

async function completeDocumentSubmitByTransactionController (req, res) {
  try {
    const result = await completeDocumentSubmit({
      transactionId: req.params.transactionId,
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

    const status =
      error.code === 'FORBIDDEN' || error.code === 'UNAUTHORIZED'
        ? 403
        : ['TRANSACTION_NOT_FOUND', 'PROCESS_INSTANCE_NOT_FOUND', 'NO_ACTIVE_TASK'].includes(
          error.code
        )
          ? 404
          : ['VALIDATION_ERROR', 'SIGNATURE_REQUIRED', 'SUBMIT_NOT_DRAFT'].includes(
            error.code
          )
            ? 400
            : error.code === 'WORKFLOW_START_FAILED'
              ? 502
              : 500

    return handleWorkflowError(res, error, status)
  }
}

async function getEmployeeCertificateController (req, res) {
  try {
    const data = await getCertificateBundle(req.params.transactionId, {
      userId: req.user.id,
      audience: 'employee'
    })

    return sendWorkflowSuccess(res, data, 'تم جلب بيانات الشهادة بنجاح')
  } catch (error) {
    const status =
      error.code === 'UNAUTHORIZED'
        ? 403
        : error.code === 'TRANSACTION_NOT_FOUND' || error.code === 'NOT_FOUND'
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

module.exports = {
  startWorkflowController,
  createSigningChallengeController,
  createDocumentSubmitSigningChallengeController,
  createDocumentSubmitSigningChallengeByProcessController,
  createDocumentSubmitSigningChallengeByTransactionController,
  completeDocumentSubmitController,
  completeDocumentSubmitByTransactionController,
  completeTaskController,
  getAllTasksController,
  getInProgressTasksController,
  getPendingPickupTasksController,
  getCompletedByDepartmentController,
  getRejectedByDepartmentController,
  getCompletedLastMonthStatsController,
  getRejectedLastMonthStatsController,
  getActiveStatsController,
  getEmployeeCertificateController,
  getTaskDetailsController
}
