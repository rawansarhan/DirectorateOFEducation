'use strict'

const Joi = require('joi')
const {
  taskDecisionSchema,
  normalizeSigningDecision
} = require('./signingChallengeSchema')
const { submissionFileItemSchema } = require('./submissionFileSchema')
const { sanitizeOptionalSubmissionPayload } = require('./submissionPayloadSanitizer')

const fieldItemSchema = Joi.object({
  key: Joi.string().max(128).required(),
  value: Joi.any().allow(null, '')
})

const fileItemSchema = submissionFileItemSchema

const employeeSchema = Joi.object({
  first_name: Joi.string().trim().min(1).max(100).required().messages({
    'any.required': 'employee.first_name مطلوب',
    'string.min': 'employee.first_name مطلوب'
  }),
  last_name: Joi.string().trim().min(1).max(100).required().messages({
    'any.required': 'employee.last_name مطلوب',
    'string.min': 'employee.last_name مطلوب'
  }),
  father_name: Joi.string().trim().min(1).max(100).required().messages({
    'any.required': 'employee.father_name مطلوب',
    'string.min': 'employee.father_name مطلوب'
  }),
  national_id: Joi.string().trim().min(1).max(50).required().messages({
    'any.required': 'employee.national_id مطلوب',
    'string.min': 'employee.national_id مطلوب'
  })
})

const templateItemSchema = Joi.object({
  template_id: Joi.number().integer().positive(),
  id: Joi.number().integer().positive(),
  values: Joi.object().default({})
})
  .or('template_id', 'id')
  .custom(value => ({
    template_id: value.template_id || value.id,
    values: value.values || {}
  }))

const actionItemSchema = Joi.object({
  name: Joi.string().max(64).required(),
  payload: Joi.object().default({}),
  result: Joi.object().optional()
}).unknown(false)

const signatureSchema = Joi.object({
  challenge_id: Joi.string().uuid(),
  signing_id: Joi.string().uuid(),
  signature: Joi.string().min(16).required()
})
  .or('challenge_id', 'signing_id')
  .custom(value => ({
    challenge_id: value.challenge_id || value.signing_id,
    signature: value.signature
  }))

const completeTaskPayloadSchema = Joi.object({
  stage_name: Joi.string().max(256).optional(),
  employee: employeeSchema.optional(),
  variables: Joi.object({
    decision: Joi.string().min(1).max(128).optional()
  }).default({}).optional(),
  decision: taskDecisionSchema.when('signature', {
    is: Joi.exist(),
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  rejection_reason: Joi.when('decision', {
    is: Joi.valid('reject', 'rejected'),
    then: Joi.string().trim().min(1).max(5000).required().messages({
      'any.required': 'rejection_reason مطلوب عند decision = reject',
      'string.min': 'rejection_reason مطلوب عند decision = reject'
    }),
    otherwise: Joi.string().max(5000).allow('', null).optional()
  }),
  signature: signatureSchema.optional(),
  expected_version: Joi.number().integer().min(0).optional(),
  fields: Joi.array().items(fieldItemSchema).default([]),
  files: Joi.array().items(fileItemSchema).default([]),
  templates: Joi.array().items(templateItemSchema).default([]),
  actions: Joi.array().items(actionItemSchema).default([]),
  note: Joi.string().max(10000).allow('', null).optional(),
  notes: Joi.string().max(10000).allow('', null).optional()
}).unknown(false)

function buildCompleteTaskFields ({ fields = [], employee = null }) {
  if (!employee) {
    return fields
  }

  const reservedKeys = new Set([
    'employee_first_name',
    'employee_last_name',
    'employee_father_name',
    'employee_national_id'
  ])

  const customFields = fields.filter(item => !reservedKeys.has(item.key))

  return [
    { key: 'employee_first_name', value: employee.first_name },
    { key: 'employee_last_name', value: employee.last_name },
    { key: 'employee_father_name', value: employee.father_name },
    { key: 'employee_national_id', value: employee.national_id },
    ...customFields
  ]
}

function validateCompleteTaskPayload (payload = {}) {
  const sanitizedPayload = sanitizeOptionalSubmissionPayload(payload)

  const { error, value } = completeTaskPayloadSchema.validate(sanitizedPayload, {
    abortEarly: false,
    stripUnknown: true
  })

  if (error) {
    return {
      value: null,
      error: error.details.map(d => d.message).join('; ')
    }
  }

  const normalized = {
    ...value,
    note: value.note ?? value.notes ?? '',
    variables: value.variables && Object.keys(value.variables).length
      ? value.variables
      : {},
    fields: buildCompleteTaskFields({
      fields: value.fields || [],
      employee: value.employee || null
    }),
    files: value.files || [],
    templates: (value.templates || []).map(template => ({
      template_id: template.template_id,
      values: template.values || {}
    }))
  }

  if (normalized.decision === 'rejected') {
    normalized.decision = 'reject'
  }

  if (normalized.decision) {
    normalized.decision = normalizeSigningDecision(normalized.decision)
  }

  if (normalized.decision === 'reject' && normalized.variables?.decision !== 'reject') {
    normalized.variables = {
      ...(normalized.variables || {}),
      decision: 'reject'
    }
  }

  delete normalized.employee

  return { value: normalized, error: null }
}

module.exports = {
  completeTaskPayloadSchema,
  validateCompleteTaskPayload,
  buildCompleteTaskFields
}
