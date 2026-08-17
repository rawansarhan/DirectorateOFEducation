'use strict'

const {
  buildApplicantName,
  resolveDepartmentName,
  isLockedByUser
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
    userId = null,
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
    this.type_trans_id = processDefinition?.type_trans_id ?? typeTrans?.id ?? null
    this.type_process_id = this.type_trans_id
    this.process_definition_id = processDefinition?.id ?? processInstance?.process_definition_id ?? null
    this.applicant_name = buildApplicantName(transaction, user)
    this.department = departmentName || processDefinitionName || null
    this.date = formatTransactionDate(transaction?.created_at)
    this.progress_percent = progressPercent ?? 0
    this.status = employeeStatus?.status ?? null
    this.status_label = employeeStatus?.status_label ?? null
    this.task_id = activeTask?.id ?? null
    this.task_name = stageName
    this.is_locked_by_me = Boolean(
      this.status === 'in_progress' &&
        activeTask?.id &&
        isLockedByUser(processInstance, activeTask.id, userId)
    )
    this.process_name = processDefinitionName
    this.process_priority = normalizeProcessPriority(processDefinition?.priority)
    this.activity_at = transaction?.created_at ?? null
  }
}

module.exports = {
  EmployeeTaskOutputDTO
}
