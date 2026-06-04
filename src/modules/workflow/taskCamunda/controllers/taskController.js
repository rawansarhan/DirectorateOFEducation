const completeTaskService = require('../services/completeTaskService')

const getAllTasksService = require('../services/getAllTasksService')

const getTaskDetailsService = require('../services/getTaskDetailsService')

const { startWorkflow } = require('../services/startWorkflowService')

const { createSigningChallenge } = require('../services/transactionSigningService')

const { getClientMeta } = require('../../../../core/security/securityConfig')

const { respondIfSecurityError } = require('../../../../core/security/securityResponseHelper')

const ApiResponder = require('../../../../core/utils/apiResponder')
const {
  sendWorkflowError,
  workflowValidationError
} = require('../../../../core/utils/workflowResponseHelper')
const { validateCompleteTaskPayload } = require('../../schemas/completeTaskSchema')
const { parsePaginationQuery } = require('../../../../core/utils/pagination')


function handleWorkflowError (res, error, defaultStatus = 400) {

  if (respondIfSecurityError(res, error, defaultStatus)) {

    return

  }

  const conflictCodes = [
    'TASK_LOCKED_BY_ANOTHER',
    'TASK_LOCK_REQUIRED',
    'TASK_LOCK_EXPIRED',
    'VERSION_CONFLICT'
  ]

  if (conflictCodes.includes(error.code)) {
    return ApiResponder.error(res, {
      message: error.message,
      statusCode: 409,
      extra: {
        code: error.code,
        locked_by: error.lockedBy ?? undefined,
        locked_until: error.lockedUntil ?? undefined,
        current_version: error.currentVersion ?? undefined,
        expected_version: error.expectedVersion ?? undefined
      }
    })
  }

  const status =

    error.message === 'Task not found' ? 404 :

    error.message === 'Digital signature is required. Call POST /tasks/:taskId/signing-challenge first.' ? 400 :

    defaultStatus



  return ApiResponder.error(res, {

    message: error.message,

    statusCode: status

  })

}


async function startWorkflowController (req, res) {

  try {

    const { transactionId, processCode } = req.body



    if (!transactionId || !processCode) {

      return ApiResponder.badRequestResponse(res, 'transactionId and processCode are required')

    }



    const result = await startWorkflow({ transactionId, processCode })



    return ApiResponder.okResponse(res, result)

  } catch (error) {

    return handleWorkflowError(res, error, 400)

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



    return ApiResponder.okResponse(res, result)

  } catch (error) {

    return handleWorkflowError(res, error, 400)

  }

}



async function completeTaskController (req, res) {
  try {
    const { error: validationError } = validateCompleteTaskPayload(req.body)
    if (validationError) {
      return sendWorkflowError(
        res,
        workflowValidationError(validationError)
      )
    }

    const result = await completeTaskService.completeTask({

      taskId: req.params.taskId,

      userId: req.user.id,

      payload: req.body,

      clientMeta: getClientMeta(req)

    })



    return ApiResponder.okResponse(res, result.data, result.message)

  } catch (error) {

    return handleWorkflowError(res, error, 500)

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

     return ApiResponder.success(res, {

      data: result.data,

      message: result.message,

      statusCode: 200

    })

  } catch (error) {

    return handleWorkflowError(res, error, 500)

}}



async function getTaskDetailsController (req, res) {

  try {

    const result = await getTaskDetailsService.getTaskDetails({

      taskId: req.params.taskId,

      userId: req.user.id

    })



    return ApiResponder.okResponse(res, result.data, result.message)

  } catch (error) {

    return handleWorkflowError(res, error, 500)

  }

}



module.exports = {

  startWorkflowController,

  createSigningChallengeController,

  completeTaskController,

  getAllTasksController,

  getTaskDetailsController

}

