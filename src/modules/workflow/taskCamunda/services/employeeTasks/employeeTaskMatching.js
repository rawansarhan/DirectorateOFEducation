'use strict'

const employeeTaskRepository = require('../../repositories/employeeTaskRepository')
const processInstanceRepository = require('../../repositories/processInstanceRepository')
const stageRepository = require('../../../processDefinition/repositories/stageRepository')
const camundaClient = require('../../../../../core/shared/clients/camunda/camundaClient')
const { retryWithBackoff } = require('../../../../../core/utils/retryWithBackoff')
const {
  userMatchesAssigneeRoute,
  getCachedStageAssignmentsForPickup
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

  const stage = await stageRepository.findByCodeAndProcess(
    instance.process_definition_id,
    activeTask.taskDefinitionKey
  )

  if (!stage) {
    return null
  }

  const assignments = await getCachedStageAssignmentsForPickup(stage.id)

  return {
    ...stage.toJSON(),
    stage_assignments: assignments.map(item => ({
      organization_department_role: {
        id: item.organization_department_roles_id,
        department: item.department_id
          ? { name: item.departmentName }
          : null,
        organization: item.organization_id
          ? { name: item.organizationName }
          : null
      }
    }))
  }
}

async function syncCurrentStageIfNeeded (instance, activeStage, activeTaskCount = 1) {
  if (!activeStage?.id || activeTaskCount > 1) {
    return
  }

  if (instance.current_stage_id === activeStage.id) {
    return
  }

  await processInstanceRepository.update(instance.id, {
    current_stage_id: activeStage.id
  })

  instance.current_stage_id = activeStage.id

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
    const activeTasks = taskMap.get(instance.camunda_process_instance_id) || []

    if (!activeTasks.length) {
      continue
    }

    for (const activeTask of activeTasks) {
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

      await syncCurrentStageIfNeeded(instance, activeStage, activeTasks.length)

      matched.push({ instance, activeTask, activeStage })
    }
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
