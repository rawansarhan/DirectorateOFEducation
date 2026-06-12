'use strict'

class UserTransactionListItemDTO {
  constructor ({
    transaction,
    processDefinitionName,
    stageName,
    progressPercent,
    priority
  }) {
    this.transaction_id = transaction.id
    this.id_process = transaction.id_process ?? null
    this.process_definition_name = processDefinitionName ?? null
    this.stage_name = stageName ?? null
    this.progress_percent = progressPercent ?? 0
    this.priority = priority ?? 0
    this.status = transaction.status
    this.created_at = transaction.created_at
    this.updated_at = transaction.updated_at
  }
}

module.exports = {
  UserTransactionListItemDTO
}
