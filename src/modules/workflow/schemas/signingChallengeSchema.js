'use strict'

const Joi = require('joi')
const {
  buildStrictFormPayloadSchema,
  formatStrictFormJoiError
} = require('../services/unifiedFormPayloadService')

const SIGNING_DECISIONS = ['approve', 'reject', 'rejected']

const taskDecisionSchema = Joi.string()
  .valid(...SIGNING_DECISIONS)
  .required()
  .messages({
    'any.only': 'decision يجب أن يكون approve أو reject',
    'any.required': 'decision مطلوب'
  })

const completeAssignmentItemSchema = Joi.object({
  organization_id: Joi.number().integer().positive().required(),
  department_id: Joi.number().integer().positive().required(),
  role_id: Joi.number().integer().positive().required()
}).unknown(false)

const completeAssignmentsSchema = Joi.array()
  .items(completeAssignmentItemSchema)
  .min(1)
  .max(1)
  .messages({
    'array.min': 'assignments يجب أن يحتوي عنصراً واحداً',
    'array.max': 'assignments يقبل عنصراً واحداً فقط'
  })

const pinSchema = Joi.string()
  .length(6)
  .pattern(/^\d+$/)
  .required()
  .messages({
    'string.length': 'رمز PIN يجب أن يتكون من 6 أرقام',
    'string.pattern.base': 'رمز PIN يجب أن يحتوي على أرقام فقط',
    'any.required': 'رمز PIN مطلوب'
  })

const signingChallengePayloadSchema = buildStrictFormPayloadSchema({
  includeTemplates: true,
  includeDecision: true,
  includeExpectedVersion: false,
  requireSignature: false,
  allowRejectionReason: true
}).keys({
  pin: pinSchema,
  decision: taskDecisionSchema,
  assignments: completeAssignmentsSchema.optional()
})

function normalizeSigningDecision (decision) {
  if (decision === 'rejected') {
    return 'reject'
  }

  return decision
}

function validateSigningChallengePayload (payload = {}) {
  const { error, value } = signingChallengePayloadSchema.validate(payload, {
    abortEarly: false,
    stripUnknown: false
  })

  if (error) {
    return {
      value: null,
      error: formatStrictFormJoiError(
        error,
        'POST /api/workflow/tasks/{taskId}/signing-challenge'
      )
    }
  }

  const normalized = {
    ...value,
    note: value.note ?? '',
    templates: (value.templates || []).map(template => ({
      id: template.id,
      widgets: template.widgets || []
    })),
    decision: normalizeSigningDecision(value.decision)
  }

  return { value: normalized, error: null }
}

module.exports = {
  SIGNING_DECISIONS,
  taskDecisionSchema,
  pinSchema,
  completeAssignmentItemSchema,
  completeAssignmentsSchema,
  signingChallengePayloadSchema,
  normalizeSigningDecision,
  validateSigningChallengePayload
}
