'use strict'

const Joi = require('joi')

const taskDecisionSchema = Joi.string().min(1).max(64).required()

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

  return { value, error: null }
}

module.exports = {
  taskDecisionSchema,
  signingChallengePayloadSchema,
  validateSigningChallengePayload
}
