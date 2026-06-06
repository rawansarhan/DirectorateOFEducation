'use strict'

const Joi = require('joi')

const ALLOWED_EXTENSION_PATTERN = /^[a-z0-9]{1,10}$/

const filePickerBodySchema = Joi.object({
  label: Joi.string()
    .trim()
    .min(1)
    .max(255)
    .required()
    .messages({
      'string.empty': 'label مطلوب',
      'any.required': 'label مطلوب'
    }),

  is_required: Joi.boolean()
    .default(false),

  max_size_mb: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .required()
    .messages({
      'any.required': 'max_size_mb مطلوب',
      'number.min': 'max_size_mb يجب أن يكون 1 على الأقل',
      'number.max': 'max_size_mb يجب ألا يتجاوز 100'
    }),

  allowed_extensions: Joi.array()
    .items(
      Joi.string()
        .trim()
        .lowercase()
        .pattern(ALLOWED_EXTENSION_PATTERN)
        .messages({
          'string.pattern.base': 'امتداد الملف غير صالح'
        })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'يجب تحديد امتداد واحد على الأقل',
      'any.required': 'allowed_extensions مطلوب'
    }),

  allow_multiple: Joi.boolean()
    .default(false)
}).messages({
  'object.unknown': 'الحقل {#label} غير مسموح به'
})

function normalizeExtensions (extensions = []) {
  return [...new Set(extensions.map(ext => String(ext).trim().toLowerCase()))]
}

function validateCreateFilePicker (data) {
  const { error, value } = filePickerBodySchema.validate(data, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true
  })

  if (error) {
    return { error, value: null }
  }

  return {
    error: null,
    value: {
      ...value,
      is_required: Boolean(value.is_required),
      max_size_mb: Number(value.max_size_mb),
      allowed_extensions: normalizeExtensions(value.allowed_extensions),
      allow_multiple: Boolean(value.allow_multiple)
    }
  }
}

module.exports = {
  validateCreateFilePicker
}
