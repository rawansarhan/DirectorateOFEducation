const employeeTaskRepository = require('../repositories/employeeTaskRepository')
const camundaClient = require('../../../../core/shared/clients/camunda/camundaClient')


// ======================================================
// GET ALL TASKS
// ======================================================

async function getAllTasks ({ userId }) {
  // ====================================================
  // USER ROLES
  // ====================================================

  const roleIds = await employeeTaskRepository.getUserRoleIds(userId)

  if (!roleIds.length) {
    return {
      message: 'No tasks found',

      data: []
    }
  }

  // ====================================================
  // STAGES
  // ====================================================

  const stageIds = await employeeTaskRepository.getStageIdsByRoles(roleIds)

  if (!stageIds.length) {
    return {
      message: 'No tasks found',

      data: []
    }
  }

  // ====================================================
  // PROCESS INSTANCES
  // ====================================================

  const processInstances = await employeeTaskRepository.getRunningInstances(
    stageIds
  )

  // ====================================================
  // BUILD TASKS
  // ====================================================

  const tasks = []

  for (const instance of processInstances) {
    // ==================================================
    // CAMUNDA TASKS
    // ==================================================

    const activeTasks = await camundaClient.getActiveTasks(
      instance.camunda_process_instance_id
    )

    const activeTask = activeTasks?.[0]

    if (!activeTask) {
      continue
    }

    // ==================================================
    // RESPONSE OBJECT
    // ==================================================

    tasks.push({

         // ================================================
      // PROCESS
      // ================================================

      processName: instance.process_definition?.name,
      // ================================================
      // TASK
      // ================================================

      taskId: activeTask.id,

      taskName: activeTask.name,

      taskDefinitionKey: activeTask.taskDefinitionKey,

      // ================================================
      // TRANSACTION
      // ================================================

      HestoryData: instance.transaction?.data,

   

    })
  }

  // ====================================================
  // FINAL SORT
  // ====================================================

  tasks.sort((a, b) => {
    // ==============================================
    // PRIORITY
    // ==============================================

    if (b.processPriority !== a.processPriority) {
      return b.processPriority - a.processPriority
    }

    // ==============================================
    // OLDEST FIRST
    // ==============================================

    return new Date(a.createdAt) - new Date(b.createdAt)
  })

  // ====================================================
  // RESPONSE
  // ====================================================

  return {
    message: 'Tasks fetched successfully',

    count: tasks.length,

    data: tasks
  }
}


module.exports = {
  getAllTasks
}