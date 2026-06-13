'use strict'

const Joi = require('joi')
const { pickTypeDocIdFromObject } = require('../../../../core/utils/typeDocId')

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
    .default(false),

  type_doc_id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'any.required': 'type_doc_id مطلوب',
      'number.base': 'type_doc_id يجب أن يكون رقماً صحيحاً',
      'number.integer': 'type_doc_id يجب أن يكون رقماً صحيحاً',
      'number.positive': 'type_doc_id يجب أن يكون رقماً موجباً'
    })
}).messages({
  'object.unknown': 'الحقل {#label} غير مسموح به'
})

function normalizeExtensions (extensions = []) {
  return [...new Set(extensions.map(ext => String(ext).trim().toLowerCase()))]
}

function normalizeCreatePayload (data = {}) {
  const {
    typeDoc_id: _typeDocId,
    type_Doc_id: _typeDocIdAlt,
    TypeDoc_id: _typeDocIdLegacy,
    ...rest
  } = data

  return {
    ...rest,
    type_doc_id: pickTypeDocIdFromObject(data)
  }
}

function validateCreateFilePicker (data) {
  const payload = normalizeCreatePayload(data)
  const { error, value } = filePickerBodySchema.validate(payload, {
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
      allow_multiple: Boolean(value.allow_multiple),
      type_doc_id: Number(value.type_doc_id)
    }
  }
}

module.exports = {
  validateCreateFilePicker
}
