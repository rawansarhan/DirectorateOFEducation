'use strict'

const Joi = require('joi')
const {
  taskDecisionSchema,
  normalizeSigningDecision
} = require('./signingChallengeSchema')
const {
  buildStrictFormPayloadSchema,
  formatStrictFormJoiError
} = require('../services/unifiedFormPayloadService')

const completeTaskPayloadSchema = buildStrictFormPayloadSchema({
  includeTemplates: true,
  includeDecision: true,
  includeExpectedVersion: true,
  allowSignature: true,
  allowRejectionReason: true
}).keys({
  decision: taskDecisionSchema.when('signature', {
    is: Joi.exist(),
    then: Joi.required(),
    otherwise: Joi.optional()
  })
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
      value: template.value ?? {}
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

module.exports = {
  completeTaskPayloadSchema,
  validateCompleteTaskPayload
}
