const completeTaskService = require('../services/completeTaskService')

const getAllTasksService = require('../services/getAllTasksService')

const getTaskDetailsService = require('../services/getTaskDetailsService')

const { startWorkflow } = require('../services/startWorkflowService')

const { createSigningChallenge } = require('../services/transactionSigningService')

const { getClientMeta } = require('../../../../core/security/securityConfig')

const { respondIfSecurityError } = require('../../../../core/security/securityResponseHelper')



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
    return res.status(409).json({
      success: false,
      message: error.message,
      code: error.code,
      locked_by: error.lockedBy ?? undefined,
      locked_until: error.lockedUntil ?? undefined,
      current_version: error.currentVersion ?? undefined,
      expected_version: error.expectedVersion ?? undefined
    })
  }

  const status =

    error.message === 'Task not found' ? 404 :

    error.message === 'Digital signature is required. Call POST /tasks/:taskId/signing-challenge first.' ? 400 :

    defaultStatus



  return res.status(status).json({

    success: false,

    message: error.message

  })

}



async function startWorkflowController (req, res) {

  try {

    const { transactionId, processCode } = req.body



    if (!transactionId || !processCode) {

      return res.status(400).json({

        success: false,

        message: 'transactionId and processCode are required'

      })

    }



    const result = await startWorkflow({ transactionId, processCode })



    return res.status(200).json({

      success: true,

      data: result

    })

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



    return res.status(200).json({

      success: true,

      data: result

    })

  } catch (error) {

    return handleWorkflowError(res, error, 400)

  }

}



async function completeTaskController (req, res) {

  try {

    const result = await completeTaskService.completeTask({

      taskId: req.params.taskId,

      userId: req.user.id,

      payload: req.body,

      clientMeta: getClientMeta(req)

    })



    return res.status(200).json(result)

  } catch (error) {

    return handleWorkflowError(res, error, 500)

  }

}



async function getAllTasksController (req, res) {

  try {

    const result = await getAllTasksService.getAllTasks({

      userId: req.user.id

    })



    return res.status(200).json(result)

  } catch (error) {

    return handleWorkflowError(res, error, 500)

  }

}



async function getTaskDetailsController (req, res) {

  try {

    const result = await getTaskDetailsService.getTaskDetails({

      taskId: req.params.taskId,

      userId: req.user.id

    })



    return res.status(200).json(result)

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

