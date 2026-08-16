'use strict'

const Joi = require('joi')
const { pinSchema, normalizeSigningDecision } = require('./signingChallengeSchema')
const {
  buildStrictFormPayloadSchema,
  formatStrictFormJoiError
} = require('../services/unifiedFormPayloadService')

const documentSubmitSigningChallengeSchema = buildStrictFormPayloadSchema({
  includeTemplates: true,
  includeDecision: true,
  includeExpectedVersion: false,
  requireSignature: false
}).keys({
  pin: pinSchema,
  decision: Joi.string().valid('approve').default('approve')
})

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
    stripUnknown: false
  })

  if (error) {
    return {
      value: null,
      error: formatStrictFormJoiError(
        error,
        'POST .../submit-documents/signing-challenge'
      )
    }
  }

  return {
    value: {
      ...value,
      note: value.note ?? '',
      templates: (value.templates || []).map(template => ({
        id: template.id,
        widgets: template.widgets || []
      })),
      decision: normalizeSigningDecision(value.decision || 'approve')
    },
    error: null
  }
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
