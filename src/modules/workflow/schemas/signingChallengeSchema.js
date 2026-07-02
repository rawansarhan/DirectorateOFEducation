'use strict'

const Joi = require('joi')

const SIGNING_DECISIONS = ['approve', 'reject', 'rejected']

const taskDecisionSchema = Joi.string()
  .valid(...SIGNING_DECISIONS)
  .required()
  .messages({
    'any.only': 'decision يجب أن يكون approve أو reject',
    'any.required': 'decision مطلوب'
  })

const signingChallengePayloadSchema = Joi.object({
  pin: Joi.string()
    .length(6)
    .pattern(/^\d+$/)
    .required()
    .messages({
      'string.length': 'رمز PIN يجب أن يتكون من 6 أرقام',
      'string.pattern.base': 'رمز PIN يجب أن يحتوي على أرقام فقط',
      'any.required': 'رمز PIN مطلوب'
    }),
  decision: taskDecisionSchema
}).unknown(false)

function normalizeSigningDecision (decision) {
  if (decision === 'rejected') {
    return 'reject'
  }

  return decision
}

function validateSigningChallengePayload (payload = {}) {
  const { error, value } = signingChallengePayloadSchema.validate(payload, {
    abortEarly: false,
    stripUnknown: true
  })

  if (error) {
    return {
      value: null,
      error: error.details.map(d => d.message).join('; ')
    }
  }

  return {
    value: {
      ...value,
      decision: normalizeSigningDecision(value.decision)
    },
    error: null
  }
}

module.exports = {
  SIGNING_DECISIONS,
  taskDecisionSchema,
  signingChallengePayloadSchema,
  normalizeSigningDecision,
  validateSigningChallengePayload
}
