const completeTaskService = require('../services/completeTaskService')
const getAllTasksService = require('../services/getAllTasksService')
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
const { parsePaginationQuery } = require('../../../../core/utils/pagination')

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

    return sendWorkflowSuccess(
      res,
      result.data,
      result.message || 'تم بدء سير العمل بنجاح'
    )
  } catch (error) {
    return sendWorkflowError(res, error)
  }
}

async function createSigningChallengeController (req, res) {
  try {
    const result = await createSigningChallenge({
      taskId: req.params.taskId,
      userId: req.user.id,
      payload: req.body || {},
      clientMeta: getClientMeta(req)
    })

    return sendWorkflowSuccess(
      res,
      result,
      'تم إنشاء تحدي التوقيع بنجاح'
    )
  } catch (error) {
    return sendWorkflowError(res, error)
  }
}

async function completeTaskController (req, res) {
  try {
    const { value: payload, error: validationError } =
      validateCompleteTaskPayload(req.body || {})

    if (validationError) {
      return sendWorkflowError(
        res,
        workflowValidationError(validationError)
      )
    }

    const result = await completeTaskService.completeTask({
      taskId: req.params.taskId,
      userId: req.user.id,
      payload,
      clientMeta: getClientMeta(req)
    })

    return sendWorkflowSuccess(
      res,
      {
        ...result.data,
        idempotent_replay: Boolean(result.idempotent_replay)
      },
      result.idempotent_replay
        ? 'تم إكمال المهمة مسبقاً'
        : 'تم إكمال المهمة بنجاح'
    )
  } catch (error) {
    return sendWorkflowError(res, error)
  }
}

async function getAllTasksController (req, res) {
  try {
    const { page, limit, offset } = parsePaginationQuery(req.query)

    const result = await getAllTasksService.getAllTasks({
      userId: req.user.id,
      page,
      limit,
      offset
    })

    return sendWorkflowSuccess(
      res,
      result.data,
      result.message || 'تم جلب المهام بنجاح'
    )
  } catch (error) {
    return sendWorkflowError(res, error)
  }
}

async function getTaskDetailsController (req, res) {
  try {
    const result = await getTaskDetailsService.getTaskDetails({
      taskId: req.params.taskId,
      userId: req.user.id
    })

    return sendWorkflowSuccess(
      res,
      result.data,
      result.message || 'تم جلب تفاصيل المهمة بنجاح'
    )
  } catch (error) {
    return sendWorkflowError(res, error)
  }
}

module.exports = {
  startWorkflowController,
  createSigningChallengeController,
  completeTaskController,
  getAllTasksController,
  getTaskDetailsController
}
