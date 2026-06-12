'use strict'

const Joi = require('joi')
const { submissionFileItemSchema } = require('./submissionFileSchema')
const { sanitizeOptionalSubmissionPayload } = require('./submissionPayloadSanitizer')
const {
  submitFieldItemMessages,
  submitPayloadRootMessages,
  formatSubmitTransactionJoiError
} = require('./submitTransactionPayloadMessages')

const SUBMISSION_SCHEMA_VERSION = '1.0'

const fieldItemSchema = Joi.object({
  key: Joi.string().max(128).required(),
  value: Joi.any().allow(null, '')
})

const submitFieldItemSchema = Joi.object({
  key: Joi.string().max(128).required().messages(submitFieldItemMessages),
  value: Joi.any().allow(null, '').messages({
    'any.required': 'fields[].value مطلوب'
  })
})

const fileItemSchema = submissionFileItemSchema

const templateItemSchema = Joi.object({
  template_id: Joi.number().integer().positive().required(),
  values: Joi.object().default({})
})

const actionItemSchema = Joi.object({
  name: Joi.string().max(64).required(),
  payload: Joi.object().default({}),
  result: Joi.object().optional()
}).unknown(false)

const signatureSchema = Joi.object({
  signing_id: Joi.string().uuid().required(),
  signature: Joi.string().min(16).required()
})

function buildStageSubmissionSchema (options = {}) {
  const {
    requireVariables = false,
    requireSignature = false
  } = options

  return Joi.object({
    schema_version: Joi.string()
      .valid(SUBMISSION_SCHEMA_VERSION)
      .default(SUBMISSION_SCHEMA_VERSION),
    expected_version: Joi.number().integer().min(0).optional(),
    fields: Joi.array().items(fieldItemSchema).default([]),
    files: Joi.array().items(fileItemSchema).default([]),
    templates: Joi.array().items(templateItemSchema).default([]),
    actions: Joi.array().items(actionItemSchema).default([]),
    variables: requireVariables
      ? Joi.object().min(1).required()
      : Joi.object().default({}),
    stage_name: Joi.string().max(256).optional(),
    decision: Joi.string().max(64).optional(),
    note: Joi.string().max(10000).allow('', null).optional(),
    notes: Joi.string().max(10000).allow('', null).optional(),
    signature: requireSignature
      ? signatureSchema.required()
      : signatureSchema.optional()
  }).unknown(false)
}

const submitTransactionPayloadSchema = Joi.object({
  stage_name: Joi.string().max(256).optional().messages({
    'string.max': 'stage_name أطول من 256 حرفاً'
  }),
  fields: Joi.array().items(submitFieldItemSchema).default([]),
  files: Joi.array().items(fileItemSchema).default([]),
  templates: Joi.array().items(templateItemSchema).default([]),
  decision: Joi.string().max(64).default('submit').messages({
    'string.max': 'decision أطول من 64 حرفاً'
  }),
  note: Joi.string().max(10000).allow('', null).default('').messages({
    'string.max': 'note أطول من 10000 حرف'
  }),
  expected_version: Joi.number().integer().min(0).optional().messages({
    'number.base': 'expected_version يجب أن يكون رقماً صحيحاً',
    'number.integer': 'expected_version يجب أن يكون رقماً صحيحاً',
    'number.min': 'expected_version لا يمكن أن يكون سالباً'
  })
})
  .unknown(false)
  .messages(submitPayloadRootMessages)

function validateStageSubmissionPayload (payload = {}, options = {}) {
  const schema = buildStageSubmissionSchema(options)
  const sanitizedPayload = sanitizeOptionalSubmissionPayload(payload)

  const { error, value } = schema.validate(sanitizedPayload, {
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

function validateSubmitTransactionPayload (payload = {}) {
  const sanitizedPayload = sanitizeOptionalSubmissionPayload(payload, {
    includeVariables: false
  })

  const { error, value } = submitTransactionPayloadSchema.validate(sanitizedPayload, {
    abortEarly: false,
    stripUnknown: false
  })

  if (error) {
    const formatted = formatSubmitTransactionJoiError(error)

    return {
      value: null,
      error: formatted.message,
      details: formatted.details,
      allowed_fields: formatted.allowed_fields
    }
  }

  return { value, error: null }
}

function toFieldMap (fields = []) {
  const map = {}

  for (const item of fields) {
    if (item?.key != null) {
      map[item.key] = item.value
    }
  }

  return map
}

function toFileMap (files = []) {
  const map = {}

  for (const item of files) {
    if (item?.key != null) {
      map[item.key] = item.path
    }
  }

  return map
}

function normalizeSubmissionPayload (value = {}) {
  const fields = value.fields || []
  const files = value.files || []

  return {
    schema_version: value.schema_version || SUBMISSION_SCHEMA_VERSION,
    expected_version: value.expected_version,
    stage_name: value.stage_name ?? null,
    fields,
    files,
    templates: value.templates || [],
    actions: value.actions || [],
    variables: value.variables || {},
    decision: value.decision ?? null,
    note: value.note ?? value.notes ?? '',
    notes: value.note ?? value.notes ?? '',
    signature: value.signature,
    field_map: toFieldMap(fields),
    file_map: toFileMap(files)
  }
}

const FIELD_WIDGET_TYPES = new Set([
  'text_field',
  'date_picker',
  'dropdown',
  'radio_group',
  'check_list'
])

function buildSubmitContract (configJson = {}) {
  const fields = []
  const files = []

  for (const widget of configJson.widgets || []) {
    const widgetId = widget?.data?.id

    if (!widgetId) {
      continue
    }

    if (widget.widget_type === 'file_picker') {
      files.push({
        key: widgetId,
        path: '',
        type_doc_id: widget.data?.type_doc_id ?? null
      })
      continue
    }

    if (FIELD_WIDGET_TYPES.has(widget.widget_type)) {
      fields.push({ key: widgetId, value: null })
    }
  }

  return {
    schema_version: SUBMISSION_SCHEMA_VERSION,
    envelope: {
      schema_version: SUBMISSION_SCHEMA_VERSION,
      stage_name: configJson.stage_name || null,
      fields,
      files,
      templates: (configJson.template || []).map(item => ({
        template_id: item.template_id,
        values: {}
      })),
      decision: 'submit',
      note: ''
    }
  }
}

module.exports = {
  SUBMISSION_SCHEMA_VERSION,
  validateStageSubmissionPayload,
  validateSubmitTransactionPayload,
  submitTransactionPayloadSchema,
  normalizeSubmissionPayload,
  buildSubmitContract
}
