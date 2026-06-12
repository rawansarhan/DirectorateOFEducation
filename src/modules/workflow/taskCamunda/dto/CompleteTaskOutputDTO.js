'use strict'

const {
  extractFieldsFilesFromWidgets
} = require('../../services/stageFormSnapshotBuilder')

class CompleteTaskOutputDTO {
  constructor ({
    stage,
    stageSnapshot = {},
    variables = null,
    signatureRequest = null,
    idempotencyKey = null,
    idempotentReplay = false,
    workflowStatus = 'running',
    templates = []
  }) {
    this.stage_name = stageSnapshot.stage_name || stage?.name || null

    if (stageSnapshot.form_id) {
      this.form_id = stageSnapshot.form_id
    }

    if (stageSnapshot.form_name) {
      this.form_name = stageSnapshot.form_name
    }

    if (Array.isArray(stageSnapshot.widgets)) {
      this.widgets = stageSnapshot.widgets
    }

    const derived = Array.isArray(stageSnapshot.widgets)
      ? extractFieldsFilesFromWidgets(stageSnapshot.widgets)
      : {
          fields: stageSnapshot.fields || [],
          files: stageSnapshot.files || []
        }

    this.fields = derived.fields.map(field => ({
      key: field.key || field.name,
      value: field.value
    }))
    this.files = derived.files.map(file => ({
      key: file.key || file.name,
      path: file.path,
      type_doc_id: file.type_doc_id ?? null,
      type_doc: file.type_doc ?? null
    }))
    this.templates = templates

    if (variables && Object.keys(variables).length) {
      this.variables = variables
    }

    if (stageSnapshot.decision) {
      this.decision = stageSnapshot.decision
    }

    this.note = stageSnapshot.note ?? ''

    if (stageSnapshot.rejection_reason) {
      this.rejection_reason = stageSnapshot.rejection_reason
    }

    if (signatureRequest?.challengeId) {
      this.signature = {
        challenge_id: signatureRequest.challengeId,
        signature: signatureRequest.signature
      }
    }

    if (idempotencyKey) {
      this.idempotency_key = idempotencyKey
    }

    this.idempotent_replay = Boolean(idempotentReplay)
    this.workflow_status = workflowStatus
  }
}

module.exports = {
  CompleteTaskOutputDTO
}
