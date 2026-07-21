'use strict'

const {
  normalizeProcessPriority,
  formatTransactionDate
} = require('../utils/employeeTaskFormatters')

class TaskDetailsOutputDTO {
  constructor ({
    task,
    processInstance,
    transaction,
    previousStagesData,
    activeStage = null,
    currentStageConfig,
    processDefinition = null,
    assignments = null
  }) {
    const processDef = processDefinition || processInstance?.process_definition
    const user = transaction?.user
    const currentStage = activeStage || processInstance?.current_stage

    this.process_definition_name = processDef?.name ?? null
    this.id_task = task?.id ?? null
    this.name_task = task?.name ?? currentStage?.name ?? null

    this.applicant = {
      first_name: transaction?.first_name ?? null,
      father_name: transaction?.father_name ?? null,
      last_name: transaction?.last_name ?? null,
      national_id: transaction?.national_id ?? null,
      phone_number: user?.phone_number ?? null
    }

    this.submitted_at = formatTransactionDate(transaction?.created_at)

    // يُستخدم في POST /complete كـ expected_version لتجنّب VERSION_CONFLICT
    this.expected_version = transaction?.version ?? null

    this.transaction_history = {
      process_name: processDef?.name ?? null,
      priority: normalizeProcessPriority(processDef?.priority),
      data: previousStagesData || {}
    }

    this.currentStage = {
      id: currentStage?.id ?? null,
      name: currentStage?.name ?? null,
      config: currentStageConfig || {}
    }

    // is_assignment=true → الموظف يرسل assignments[] عند complete
    this.assignments = assignments ?? null
  }
}

module.exports = {
  TaskDetailsOutputDTO
}
