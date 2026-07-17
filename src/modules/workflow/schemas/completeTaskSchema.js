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
const {
  ORG_DEP_ROLE_ASSIGNMENT_WIDGET_ID
} = require('../stageConfig/validations/stageConfigSchema')

/** نفس هيكل config_json.assignments + value إلزامي */
const completeAssignmentsSchema = Joi.object({
  widget_type: Joi.string().valid('dropdown').required().messages({
    'any.only': 'assignments.widget_type يجب أن يكون dropdown',
    'any.required': 'assignments.widget_type مطلوب'
  }),
  data: Joi.object({
    id: Joi.string()
      .valid(ORG_DEP_ROLE_ASSIGNMENT_WIDGET_ID)
      .required()
      .messages({
        'any.only': `assignments.data.id يجب أن يكون ${ORG_DEP_ROLE_ASSIGNMENT_WIDGET_ID}`,
        'any.required': 'assignments.data.id مطلوب'
      }),
    label: Joi.string().trim().min(1).max(255).required().messages({
      'any.required': 'assignments.data.label مطلوب'
    }),
    is_required: Joi.boolean().default(true),
    options: Joi.array()
      .items(
        Joi.object({
          key: Joi.string().trim().min(1).max(64).required(),
          value: Joi.string().trim().min(1).max(255).required()
        }).unknown(false)
      )
      .min(1)
      .required()
      .messages({
        'any.required': 'assignments.data.options مطلوبة',
        'array.min': 'assignments.data.options يجب أن تحتوي خياراً واحداً على الأقل'
      })
  })
    .unknown(false)
    .required()
    .messages({
      'any.required': 'assignments.data مطلوب'
    }),
  value: Joi.string().trim().min(1).max(64).required().messages({
    'any.required': 'assignments.value مطلوب',
    'string.empty': 'assignments.value مطلوب'
  })
}).unknown(false)

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

module.exports = {
  completeAssignmentsSchema,
  completeTaskPayloadSchema,
  validateCompleteTaskPayload
}
