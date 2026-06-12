'use strict'

const Joi = require('joi')

const IDENTITY_KEYS = [
  'first_name',
  'last_name',
  'father_name',
  'mother_name',
  'national_id'
]

const IDENTITY_LABELS = {
  first_name: 'الاسم الأول',
  last_name: 'الاسم الأخير',
  father_name: 'اسم الأب',
  mother_name: 'اسم الأم',
  national_id: 'رقم الهوية'
}

function isNonEmptyIdentityValue (value) {
  if (value == null) {
    return false
  }

  if (typeof value === 'string') {
    return value.trim().length > 0
  }

  return String(value).trim().length > 0
}

function validateIdentityCompleteForSubmit (transaction = {}) {
  const missingKeys = IDENTITY_KEYS.filter(
    key => !isNonEmptyIdentityValue(transaction[key])
  )

  if (!missingKeys.length) {
    return { error: null, missing_keys: [] }
  }

  const labels = missingKeys.map(key => IDENTITY_LABELS[key]).join('، ')

  return {
    error: `يجب إكمال بيانات الهوية قبل التقديم — ${labels}`,
    missing_keys: missingKeys
  }
}

function parsePositiveInt (value, label) {
  const numeric = Number(value)

  if (!Number.isInteger(numeric) || numeric < 1) {
    throw new Error(`${label} غير صالح`)
  }

  return numeric
}

const identityFieldSchema = Joi.string()
  .trim()
  .max(100)
  .allow(null, '')
  .messages({
    'string.max': 'حقل {#label} يتجاوز الحد المسموح ({#limit} حرف)'
  })

const nationalIdSchema = Joi.string()
  .trim()
  .max(50)
  .allow(null, '')
  .pattern(/^[0-9]*$/)
  .messages({
    'string.max': 'رقم الهوية يتجاوز الحد المسموح ({#limit} حرف)',
    'string.pattern.base': 'رقم الهوية يجب أن يحتوي أرقاماً فقط'
  })

const identityBodySchema = Joi.object({
  first_name: identityFieldSchema.label('الاسم الأول'),
  last_name: identityFieldSchema.label('اسم العائلة'),
  father_name: identityFieldSchema.label('اسم الأب'),
  mother_name: identityFieldSchema.label('اسم الأم'),
  national_id: nationalIdSchema
})
  .min(1)
  .messages({
    'object.min': 'يجب إرسال حقل هوية واحد على الأقل'
  })

function validateIdentityBody (data = {}) {
  const { error, value } = identityBodySchema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  })

  if (error) {
    return {
      error: error.details.map(d => d.message).join(' | '),
      value: null
    }
  }

  const normalized = {}

  for (const key of IDENTITY_KEYS) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      normalized[key] = value[key] === '' ? null : value[key]
    }
  }

  return { error: null, value: normalized }
}

module.exports = {
  parsePositiveInt,
  validateIdentityBody,
  validateIdentityCompleteForSubmit,
  IDENTITY_KEYS,
  IDENTITY_LABELS
}
