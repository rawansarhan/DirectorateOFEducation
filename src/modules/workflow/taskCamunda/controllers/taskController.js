const completeTaskService = require('../services/completeTaskService')
const getAllTasksService = require('../services/getAllTasksService')
const getTaskDetailsService = require('../services/getTaskDetailsService')
const { startWorkflow } = require('../services/startWorkflowService')
const { createSigningChallenge } = require('../services/transactionSigningService')
const { getClientMeta } = require('../../../../core/security/securityConfig')
const {
  sendWorkflowSuccess,
  sendWorkflowError,
  HTTP_STATUS
} = require('../../../../core/utils/workflowResponseHelper')
const { validateCompleteTaskPayload } = require('../../schemas/completeTaskSchema')

async function startWorkflowController (req, res) {
  try {
    const { transactionId, processCode } = req.body

    if (!transactionId || !processCode) {
      return sendWorkflowError(res, {
        message: 'transactionId and processCode are required',
        code: 'VALIDATION_ERROR'
      })
    }

    const result = await startWorkflow({ transactionId, processCode })

    return sendWorkflowSuccess(res, result, 'Workflow started successfully')
  } catch (error) {
    return sendWorkflowError(res, error, HTTP_STATUS.BAD_REQUEST)
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
      'Signing challenge created successfully'
    )
  } catch (error) {
    return sendWorkflowError(res, error, HTTP_STATUS.BAD_REQUEST)
  }
}

async function completeTaskController (req, res) {
  try {
    const { value: payload, error: validationError } =
      validateCompleteTaskPayload(req.body || {})

    if (validationError) {
      return sendWorkflowError(res, {
        message: validationError,
        code: 'VALIDATION_ERROR'
      })
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
    return sendWorkflowError(res, error, HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
}

async function getAllTasksController (req, res) {
  try {
    const result = await getAllTasksService.getAllTasks({
      userId: req.user.id
    })

    return sendWorkflowSuccess(res, result.data, result.message)
  } catch (error) {
    return sendWorkflowError(res, error, HTTP_STATUS.INTERNAL_SERVER_ERROR)
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
    return sendWorkflowError(res, error, HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
}

module.exports = {
  startWorkflowController,
  createSigningChallengeController,
  completeTaskController,
  getAllTasksController,
  getTaskDetailsController
}
