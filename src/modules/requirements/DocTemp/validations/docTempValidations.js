'use strict'

const Joi = require('joi')
const { validateDocumentFormConfigJson } = require('../../../workflow/stageConfig/validations/stageConfigSchema')

function formatValidationError (error) {
  return error.details.map(d => d.message).join(' | ')
}

function parseConfigJsonField (value) {
  if (value == null || value === '') {
    return { error: 'حقل config_json مطلوب' }
  }

  if (typeof value === 'object') {
    return { value }
  }

  if (typeof value === 'string') {
    try {
      return { value: JSON.parse(value) }
    } catch (_) {
      return { error: 'حقل config_json يجب أن يكون JSON صالح' }
    }
  }

  return { error: 'حقل config_json غير صالح' }
}

function validateConfigJson (configJson) {
  const parsed = parseConfigJsonField(configJson)

  if (parsed.error) {
    return { error: parsed.error }
  }

  const { error, value } = validateDocumentFormConfigJson(parsed.value)

  if (error) {
    return { error: formatValidationError(error) }
  }

  return { value }
}

const typeDocIdSchema = Joi.number().integer().positive().required()
  .messages({
    'any.required': 'حقل type_doc_id مطلوب',
    'number.base': 'حقل type_doc_id يجب أن يكون رقماً صحيحاً',
    'number.integer': 'حقل type_doc_id يجب أن يكون رقماً صحيحاً',
    'number.positive': 'حقل type_doc_id يجب أن يكون رقماً موجباً'
  })

const createDocumentTemplateValidation = data => {
  const schema = Joi.object({
    name: Joi.string().trim().min(1).max(255).required()
      .messages({
        'any.required': 'حقل name مطلوب',
        'string.empty': 'حقل name لا يمكن أن يكون فارغاً'
      }),

    type_doc_id: typeDocIdSchema,

    TypeDoc_id: Joi.any().strip(),

    config_json: Joi.any().required(),

    file_path: Joi.string().required()
      .messages({
        'any.required': 'ملف القالب مطلوب',
        'string.empty': 'ملف القالب مطلوب'
      })
  })

  const { error, value } = schema.validate(data, { abortEarly: false })

  if (error) {
    return { error, value: null }
  }

  const configResult = validateConfigJson(value.config_json)

  if (configResult.error) {
    return {
      error: {
        details: [{ message: configResult.error }]
      },
      value: null
    }
  }

  return {
    error: null,
    value: {
      ...value,
      config_json: configResult.value
    }
  }
}

const updateDocumentTemplateValidation = data => {
  const schema = Joi.object({
    name: Joi.string().trim().min(1).max(255).optional(),

    type_doc_id: Joi.number().integer().positive().optional(),

    TypeDoc_id: Joi.any().strip(),

    engine_type: Joi.string()
      .valid('ACROFORM', 'POSITIONED')
      .optional(),

    config_json: Joi.any().optional(),
    file_path: Joi.string().optional()
  })

  const { error, value } = schema.validate(data, { abortEarly: false })

  if (error) {
    return { error, value: null }
  }

  if (value.config_json != null) {
    const configResult = validateConfigJson(value.config_json)

    if (configResult.error) {
      return {
        error: {
          details: [{ message: configResult.error }]
        },
        value: null
      }
    }

    value.config_json = configResult.value
  }

  return { error: null, value }
}

module.exports = {
  createDocumentTemplateValidation,
  updateDocumentTemplateValidation,
  formatValidationError,
  parseConfigJsonField
}
