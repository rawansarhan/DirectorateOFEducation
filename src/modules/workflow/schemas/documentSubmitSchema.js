'use strict'

const Joi = require('joi')
const {
  buildStrictFormPayloadSchema,
  formatStrictFormJoiError
} = require('../services/unifiedFormPayloadService')

const documentSubmitSigningChallengeSchema = Joi.object({
  pin: Joi.string()
    .length(6)
    .pattern(/^\d+$/)
    .required()
    .messages({
      'string.length': 'رمز PIN يجب أن يتكون من 6 أرقام',
      'string.pattern.base': 'رمز PIN يجب أن يحتوي على أرقام فقط',
      'any.required': 'رمز PIN مطلوب'
    })
}).unknown(false)

const documentSubmitCompleteSchema = buildStrictFormPayloadSchema({
  includeTemplates: true,
  includeDecision: true,
  includeExpectedVersion: true,
  requireSignature: true
}).keys({
  decision: Joi.string().valid('approve').required().messages({
    'any.only': 'decision يجب أن يكون approve فقط في تقديم الوثائق',
    'any.required': 'decision مطلوب — استخدم approve'
  })
})

function validateDocumentSubmitSigningChallenge (payload = {}) {
  const { error, value } = documentSubmitSigningChallengeSchema.validate(payload, {
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

function validateDocumentSubmitComplete (payload = {}) {
  const { error, value } = documentSubmitCompleteSchema.validate(payload, {
    abortEarly: false,
    stripUnknown: false
  })

  if (error) {
    return {
      value: null,
      error: formatStrictFormJoiError(
        error,
        'POST /api/workflow/tasks/{taskId}/submit-documents/complete'
      )
    }
  }

  return {
    value: {
      ...value,
      signature: {
        challenge_id: value.signature.challenge_id,
        signature: value.signature.signature
      },
      note: value.note ?? '',
      templates: (value.templates || []).map(template => ({
        id: template.id,
        widgets: template.widgets || []
      }))
    },
    error: null
  }
}

module.exports = {
  validateDocumentSubmitSigningChallenge,
  validateDocumentSubmitComplete
}
