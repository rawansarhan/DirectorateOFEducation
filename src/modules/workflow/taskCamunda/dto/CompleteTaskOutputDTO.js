'use strict'

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
    this.form_id = stageSnapshot.form_id ?? null
    this.form_name = stageSnapshot.form_name ?? null
    this.widgets = stageSnapshot.widgets ?? []
    this.templates = (templates || []).map(template => ({
      id: template.id ?? template.id_template ?? null,
      id_template: template.id_template ?? template.id ?? null,
      id_document_instance:
        template.id_document_instance ?? template.document_instance_id ?? null,
      value: template.value ?? template.values ?? {},
      generated_pdf_path: template.generated_pdf_path ?? null,
      path: template.path ?? null
    }))

    if (variables && Object.keys(variables).length) {
      this.variables = variables
    }

    if (variables?.value != null) {
      this.gateway_value = variables.value
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
        signature: signingRequest.signature
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
