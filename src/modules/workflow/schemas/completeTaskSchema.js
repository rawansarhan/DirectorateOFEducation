'use strict'

const {
  taskDecisionSchema,
  normalizeSigningDecision,
  completeAssignmentItemSchema,
  completeAssignmentsSchema
} = require('./signingChallengeSchema')
const {
  buildStrictFormPayloadSchema,
  formatStrictFormJoiError
} = require('../services/unifiedFormPayloadService')

const completeTaskPayloadSchema = buildStrictFormPayloadSchema({
  includeTemplates: true,
  includeDecision: true,
  includeExpectedVersion: true,
  requireSignature: true,
  allowRejectionReason: true
}).keys({
  decision: taskDecisionSchema.required().messages({
    'any.required': 'decision مطلوب — approve أو reject'
  }),
  assignments: completeAssignmentsSchema.optional()
})

function validateCompleteTaskPayload (payload = {}) {
  const { error, value } = completeTaskPayloadSchema.validate(payload, {
    abortEarly: false,
    stripUnknown: false
  })

  if (error) {
    return {
      value: null,
      error: formatStrictFormJoiError(error, 'POST /api/workflow/tasks/{taskId}/complete')
    }
  }

  const normalized = {
    ...value,
    note: value.note ?? '',
    templates: (value.templates || []).map(template => ({
      id: template.id,
      widgets: template.widgets || []
    }))
  }

  if (normalized.signature?.signing_id && !normalized.signature.challenge_id) {
    normalized.signature = {
      challenge_id: normalized.signature.signing_id,
      signature: normalized.signature.signature
    }
  }

  if (normalized.decision === 'rejected') {
    normalized.decision = 'reject'
  }

  if (normalized.decision) {
    normalized.decision = normalizeSigningDecision(normalized.decision)
  }

  return { value: normalized, error: null }
}

const {
  stageRequiresAssignmentSelection
} = require('../taskCamunda/services/taskAssignmentRoutingService')

/**
 * تحقق سياقي: إذا is_assignment=true و decision=approve → assignments إلزامي
 * بصيغة [{ organization_id, department_id, role_id }] (أرقام موجبة).
 */
function validateCompleteTaskAssignmentsForStage ({
  payload = {},
  configJson = null,
  isReject = false
} = {}) {
  if (isReject || !stageRequiresAssignmentSelection(configJson)) {
    return null
  }

  if (payload.assignments == null) {
    return 'assignments مطلوب (organization_id, department_id, role_id) لأن هذه المرحلة is_assignment=true'
  }

  const { error } = completeAssignmentsSchema.required().validate(payload.assignments, {
    abortEarly: false
  })

  if (error) {
    return formatStrictFormJoiError(error, 'assignments')
  }

  return null
}

module.exports = {
  completeAssignmentItemSchema,
  completeAssignmentsSchema,
  completeTaskPayloadSchema,
  validateCompleteTaskPayload,
  validateCompleteTaskAssignmentsForStage
}
