'use strict'

const {
  getTaskFormService,
  completeTaskService,
  getMyTasksService
} = require('../services/taskService')

// ==============================================
//  GET TASK FORM
// ==============================================
async function getTaskFormController(req, res) {
  try {
    const { taskId } = req.params
    const user = req.user

    const result = await getTaskFormService(taskId, user)

    return res.status(200).json({
      success: true,
      data: result
    })

  } catch (err) {
    console.error('❌ getTaskFormController error:', err)

    return res.status(400).json({
      success: false,
      message: err.message
    })
  }
}

// ==============================================
//  COMPLETE TASK
// ==============================================
async function completeTaskController(req, res) {
  try {
    const { taskId } = req.params
    const user = req.user
    const data = req.body

    const result = await completeTaskService(taskId, user, data)

    return res.status(200).json({
      success: true,
      data: result
    })

  } catch (err) {
    console.error('❌ completeTaskController error:', err)

    return res.status(400).json({
      success: false,
      message: err.message
    })
  }
}

// ==============================================
//  GET MY TASKS (Dashboard)
// ==============================================
async function getMyTasksController(req, res) {
  try {
    const user = req.user
    const query = req.query

    const result = await getMyTasksService(user, query)

    return res.status(200).json({
      success: true,
      ...result
    })

  } catch (err) {
    console.error('❌ getMyTasksController error:', err)

    return res.status(400).json({
      success: false,
      message: err.message
    })
  }
}

module.exports = {
  getTaskFormController,
  completeTaskController,
  getMyTasksController
}