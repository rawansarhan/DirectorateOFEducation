const employeeTaskRepository = require('../repositories/employeeTaskRepository')
const camundaClient = require('../../../../core/shared/clients/camunda/camundaClient')
const { toEmployeeTaskItem } = require('../mappers/taskCamundaMapper')
const {
  paginateArray,
  emptyPaginatedResult
} = require('../../../../core/utils/pagination')

// ======================================================
// GET ALL TASKS (paginated)
// ======================================================

async function getAllTasks ({ userId, page, limit, offset }) {
  const paginationInput = { page, limit, offset }

  // ====================================================
  // USER ROLES
  // ====================================================

  const roleIds = await employeeTaskRepository.getUserRoleIds(userId)

  if (!roleIds.length) {
    return {
      message: 'لا توجد مهام',
      data: emptyPaginatedResult(paginationInput)
    }
  }

  // ====================================================
  // STAGES
  // ====================================================

  const stageIds = await employeeTaskRepository.getStageIdsByRoles(roleIds)

  if (!stageIds.length) {
    return {
      message: 'لا توجد مهام',
      data: emptyPaginatedResult(paginationInput)
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
    const activeTasks = await camundaClient.getActiveTasks(
      instance.camunda_process_instance_id
    )

    const activeTask = activeTasks?.[0]

    if (!activeTask) {
      continue
    }

    tasks.push(toEmployeeTaskItem(instance, activeTask))
  }

  // ====================================================
  // SORT + PAGINATE
  // ====================================================

  tasks.sort((a, b) => {
    if (b.processPriority !== a.processPriority) {
      return b.processPriority - a.processPriority
    }

    return new Date(a.createdAt) - new Date(b.createdAt)
  })

  const { items, pagination } = paginateArray(tasks, paginationInput)

  return {
    message: 'تم جلب المهام بنجاح',
    data: {
      items,
      pagination
    }
  }
}

module.exports = {
  getAllTasks
}
