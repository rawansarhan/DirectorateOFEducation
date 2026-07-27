'use strict'

const {
  buildApplicantName,
  resolveDepartmentName
} = require('../utils/employeeTaskStatus')
const {
  normalizeProcessPriority,
  formatTransactionDate
} = require('../utils/employeeTaskFormatters')

class EmployeeTaskOutputDTO {
  constructor ({
    processInstance,
    activeTask,
    activeStage = null,
    progressPercent,
    employeeStatus,
    stageNameOverride = null
  }) {
    const transaction = processInstance?.transaction
    const processDefinition = processInstance?.process_definition
    const typeTrans = processDefinition?.type_trans
    const user = transaction?.user
    const currentStage = activeStage || processInstance?.current_stage

    const stageName =
      stageNameOverride ??
      activeTask?.name ??
      currentStage?.name ??
      null

    const departmentName = resolveDepartmentName(currentStage)
    const processDefinitionName = processDefinition?.name ?? null

    this.transaction_id = transaction?.id ?? null
    this.transaction_number = transaction?.id_process ?? null
    this.type = typeTrans?.name ?? processDefinitionName
    this.type_code = typeTrans?.code ?? null
    this.applicant_name = buildApplicantName(transaction, user)
    this.department = departmentName || processDefinitionName || null
    this.date = formatTransactionDate(transaction?.created_at)
    this.progress_percent = progressPercent ?? 0
    this.status = employeeStatus?.status ?? null
    this.status_label = employeeStatus?.status_label ?? null
    this.task_id = activeTask?.id ?? null
    this.task_name = stageName
    this.process_name = processDefinitionName
    this.process_priority = normalizeProcessPriority(processDefinition?.priority)
    this.activity_at = transaction?.created_at ?? null
  }
}

module.exports = {
  EmployeeTaskOutputDTO
}
