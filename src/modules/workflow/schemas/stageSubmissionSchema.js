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
    notes: Joi.string().max(10000).allow('', null).optional(),
    signature: requireSignature
      ? signatureSchema.required()
      : signatureSchema.optional()
  }).unknown(false)
}

function validateStageSubmissionPayload (payload = {}, options = {}) {
  const schema = buildStageSubmissionSchema(options)
  const { error, value } = schema.validate(payload, {
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
    fields,
    files,
    templates: value.templates || [],
    actions: value.actions || [],
    variables: value.variables || {},
    notes: value.notes ?? null,
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
      files.push({ key: widgetId, path: '' })
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
      fields,
      files,
      templates: (configJson.template || []).map(item => ({
        template_id: item.template_id,
        values: {}
      })),
      actions: configJson.actions || [],
      variables: {},
      notes: null
    }
  }
}

module.exports = {
  SUBMISSION_SCHEMA_VERSION,
  validateStageSubmissionPayload,
  normalizeSubmissionPayload,
  buildSubmitContract
}
