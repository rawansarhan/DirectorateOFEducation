'use strict'

const employeeTaskRepository = require('../../repositories/employeeTaskRepository')
const processInstanceRepository = require('../../repositories/processInstanceRepository')
const stageRepository = require('../../../processDefinition/repositories/stageRepository')
const camundaClient = require('../../../../../core/shared/clients/camunda/camundaClient')
const { retryWithBackoff } = require('../../../../../core/utils/retryWithBackoff')
const {
  userMatchesAssigneeRoute
} = require('../taskAssignmentRoutingService')

async function fetchActiveCamundaTasks (camundaIds) {
  return retryWithBackoff(
    () => camundaClient.getActiveTasksByProcessInstanceIds(camundaIds),
    { label: 'Camunda.getActiveTasksByProcessInstanceIds' }
  )
}

async function resolveActiveStageForInstance (instance, activeTask) {
  if (!activeTask?.taskDefinitionKey) {
    return null
  }

  return stageRepository.findByCodeAndProcess(
    instance.process_definition_id,
    activeTask.taskDefinitionKey
  )
}

async function syncCurrentStageIfNeeded (instance, activeStage) {
  if (!activeStage?.id || instance.current_stage_id === activeStage.id) {
    return
  }

  await processInstanceRepository.update(instance.id, {
    current_stage_id: activeStage.id,
    task_lock_user_id: null,
    task_lock_task_id: null,
    task_locked_at: null,
    task_lock_expires_at: null
  })

  instance.current_stage_id = activeStage.id
  instance.task_lock_user_id = null
  instance.task_lock_task_id = null
  instance.task_locked_at = null
  instance.task_lock_expires_at = null

  if (instance.current_stage) {
    instance.current_stage.id = activeStage.id
    instance.current_stage.name = activeStage.name
    instance.current_stage.code = activeStage.code
  }
}

async function matchInstancesToUserStages ({
  instances,
  stageIds,
  roleIds = [],
  taskMap,
  completedStageCodesMap = new Map()
}) {
  const matched = []

  for (const instance of instances) {
    const activeTask = taskMap.get(instance.camunda_process_instance_id)

    if (!activeTask) {
      continue
    }

    const activeStage = await resolveActiveStageForInstance(instance, activeTask)

    if (!activeStage) {
      continue
    }

    const routeMatch = userMatchesAssigneeRoute(
      roleIds,
      instance.transaction?.data,
      activeStage.code
    )

    if (routeMatch === false) {
      continue
    }

    if (routeMatch !== true && !stageIds.includes(activeStage.id)) {
      continue
    }

    const transactionId = instance.transaction?.id
    const completedCodes = transactionId
      ? completedStageCodesMap.get(transactionId)
      : null

    if (completedCodes?.has(activeStage.code)) {
      continue
    }

    await syncCurrentStageIfNeeded(instance, activeStage)

    matched.push({ instance, activeTask, activeStage })
  }

  return matched
}

async function loadEmployeeStageContext (userId) {
  const roleIds = await employeeTaskRepository.getUserRoleIds(userId)

  if (!roleIds.length) {
    return null
  }

  const context = await employeeTaskRepository.getAccessibleStageContext(roleIds)

  return {
    ...context,
    roleIds
  }
}

module.exports = {
  fetchActiveCamundaTasks,
  resolveActiveStageForInstance,
  syncCurrentStageIfNeeded,
  matchInstancesToUserStages,
  loadEmployeeStageContext
}
