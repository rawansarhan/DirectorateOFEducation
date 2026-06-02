'use strict'

const Joi = require('joi')

const SUBMISSION_SCHEMA_VERSION = '1.0'

const fieldItemSchema = Joi.object({
  key: Joi.string().max(128).required(),
  value: Joi.any().allow(null, '')
})

const fileItemSchema = Joi.object({
  key: Joi.string().max(128).required(),
  path: Joi.string().max(1024).required(),
  original_name: Joi.string().max(256).optional(),
  mime_type: Joi.string().max(128).optional()
})

const templateItemSchema = Joi.object({
  template_id: Joi.number().integer().positive().required(),
  values: Joi.object().default({})
})

const actionItemSchema = Joi.object({
  name: Joi.string().max(64).required()
}).unknown(true)

const signatureSchema = Joi.object({
  challenge_id: Joi.string().uuid().required(),
  signature: Joi.string().min(16).required()
})

const stageSubmissionPayloadSchema = Joi.object({
  schema_version: Joi.string().valid(SUBMISSION_SCHEMA_VERSION).default(SUBMISSION_SCHEMA_VERSION),
  expected_version: Joi.number().integer().min(0).optional(),
  fields: Joi.array().items(fieldItemSchema).default([]),
  files: Joi.array().items(fileItemSchema).default([]),
  templates: Joi.array().items(templateItemSchema).default([]),
  actions: Joi.array().items(actionItemSchema).default([]),
  variables: Joi.object().pattern(Joi.string(), Joi.any()).default({}),
  notes: Joi.string().max(10000).allow('', null).optional(),
  signature: signatureSchema.optional()
})

function validateStageSubmissionPayload (payload = {}, options = {}) {
  const {
    mode = 'draft',
    requireVariables = false,
    requireSignature = false
  } = options

  let schema = stageSubmissionPayloadSchema

  if (mode === 'submit') {
    schema = schema.fork(['variables'], field =>
      requireVariables ? field.required() : field.optional()
    )
  }

  const { error, value } = schema.validate(payload, {
    abortEarly: false,
    stripUnknown: false
  })

  if (error) {
    return {
      value: null,
      error: error.details.map(d => d.message).join('; ')
    }
  }

  if (requireSignature && !value.signature) {
    return {
      value: null,
      error: 'signature مطلوب (challenge_id + signature)'
    }
  }

  return { value, error: null }
}

function normalizeSubmissionPayload (payload = {}) {
  const fieldMap = Object.create(null)
  const fileMap = Object.create(null)

  for (const field of payload.fields || []) {
    fieldMap[field.key] = field.value
  }

  for (const file of payload.files || []) {
    fileMap[file.key] = file.path
  }

  return {
    schema_version: payload.schema_version || SUBMISSION_SCHEMA_VERSION,
    expected_version: payload.expected_version,
    fields: payload.fields || [],
    files: payload.files || [],
    templates: payload.templates || [],
    actions: payload.actions || [],
    variables: payload.variables || {},
    notes: payload.notes ?? null,
    signature: payload.signature || null,
    field_map: fieldMap,
    file_map: fileMap
  }
}

module.exports = {
  SUBMISSION_SCHEMA_VERSION,
  stageSubmissionPayloadSchema,
  validateStageSubmissionPayload,
  normalizeSubmissionPayload
}
