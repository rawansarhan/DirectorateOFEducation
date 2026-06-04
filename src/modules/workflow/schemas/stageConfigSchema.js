'use strict'

const Joi = require('joi')

const FIELD_TYPES = [
  'text',
  'textarea',
  'number',
  'email',
  'phone',
  'date',
  'select',
  'checkbox',
  'hidden'
]

const FILE_TYPES = ['file', 'image', 'pdf']

const configFieldSchema = Joi.object({
  key: Joi.string().min(1).max(128).required(),
  type: Joi.string().valid(...FIELD_TYPES).required(),
  required: Joi.boolean().default(false)
})

const configFileSchema = Joi.object({
  key: Joi.string().min(1).max(128).required(),
  type: Joi.string().valid(...FILE_TYPES).required(),
  required: Joi.boolean().default(false)
})

const configTemplateSchema = Joi.object({
  template_id: Joi.number().integer().positive().required()
})

const STAGE_ACTION_NAMES = [
  'SEND_EMAIL',
  'SEND_NOTIFICATION',
  'GENERATE_PDF'
]

const stageActionSchema = Joi.object({
  name: Joi.string().valid(...STAGE_ACTION_NAMES).required(),
  payload: Joi.object().default({}),
  to_organization_department_roles_id: Joi.number().integer().optional(),
  to_organization_department_roles_camunda_group_key: Joi.string().optional(),
  subject: Joi.string().optional(),
  message: Joi.string().optional()
}).unknown(true)

/** عقد المرحلة — حقول/ملفات/قوالب/متغيرات (+ actions لـ SERVICE_TASK) */
const stageConfigJsonSchema = Joi.object({
  fields: Joi.array().items(configFieldSchema).default([]),
  files: Joi.array().items(configFileSchema).default([]),
  templates: Joi.array().items(configTemplateSchema).default([]),
  variables: Joi.object()
    .pattern(Joi.string().min(1).max(64), Joi.string().min(1).max(128))
    .default({}),
  requires_digital_signature: Joi.boolean().optional(),
  actions: Joi.array().items(stageActionSchema).optional()
}).unknown(false)

/** محجوز لاحقاً لواجهة الفرونت — يُخزَّن فارغاً {} */
const stageUiJsonSchema = Joi.object({}).max(0).default({})

function validateStageConfigJson (value) {
  return stageConfigJsonSchema.validate(value, {
    abortEarly: false,
    stripUnknown: true
  })
}

function validateStageUiJson (value) {
  return stageUiJsonSchema.validate(value ?? {}, {
    abortEarly: false,
    stripUnknown: false
  })
}

module.exports = {
  FIELD_TYPES,
  FILE_TYPES,
  STAGE_ACTION_NAMES,
  stageActionSchema,
  stageConfigJsonSchema,
  stageUiJsonSchema,
  validateStageConfigJson,
  validateStageUiJson
}
