'use strict'

const Joi = require('joi')

const taskDecisionSchema = Joi.string().min(1).max(64).required()

const signingChallengePayloadSchema = Joi.object({
  pin: Joi.string().min(4).max(12).required(),
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
