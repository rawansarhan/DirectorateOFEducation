function mapTasksToStages(
  tasks,
  processId,
  existingCodes
) {

  const stagesToCreate = []

  let firstUserTaskFound = false

  for (const task of tasks) {

    if (existingCodes.has(task.taskDefinitionKey)) {
      continue
    }

    let authType = 'NOAUTH'

    if (
      task.type === 'USER_TASK' &&
      !firstUserTaskFound
    ) {
      authType = 'AUTH'
      firstUserTaskFound = true
    }

    stagesToCreate.push({
      process_definition_id: processId,
      name: task.name,
      code: task.taskDefinitionKey,
      type: task.type,
      camunda_task_key: task.taskDefinitionKey,
      auth_type: authType
    })

    existingCodes.add(task.taskDefinitionKey)
  }

  return stagesToCreate
}

module.exports = {
  mapTasksToStages
}