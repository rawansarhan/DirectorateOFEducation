'use strict'

class TransactionSearchListItemDTO {
  constructor (row = {}) {
    const plain =
      row && typeof row.get === 'function' ? row.get({ plain: true }) : row

    const processDef = plain.process_instance?.process_definition || null

    this.transaction_id = plain.id
    this.id_process = plain.id_process ?? null
    this.code = plain.code ?? null
    this.status = plain.status
    this.first_name = plain.first_name ?? null
    this.last_name = plain.last_name ?? null
    this.father_name = plain.father_name ?? null
    this.mother_name = plain.mother_name ?? null
    this.national_id = plain.national_id ?? null
    this.process_definition_id = processDef?.id ?? null
    this.process_definition_name = processDef?.name ?? null
    this.process_definition_code = processDef?.code ?? null
    this.is_complaint = Boolean(processDef?.is_complaint)
    this.priority = processDef?.priority ?? null
    this.has_final_document = Boolean(plain.final_document)
    this.created_at = plain.created_at
    this.updated_at = plain.updated_at
  }
}

module.exports = {
  TransactionSearchListItemDTO
}
