'use strict'

class EmployeeTaskOutputDTO {
  constructor (processInstance, activeTask) {
    this.processName = processInstance?.process_definition?.name ?? null
    this.processPriority = processInstance?.process_definition?.priority ?? 0
    this.taskId = activeTask?.id ?? null
    this.taskName = activeTask?.name ?? null
    this.taskDefinitionKey = activeTask?.taskDefinitionKey ?? null
    this.createdAt = activeTask?.created || processInstance?.created_at || null
    this.HestoryData = processInstance?.transaction?.data ?? null
  }
}

module.exports = {
  EmployeeTaskOutputDTO
}
