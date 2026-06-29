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

// يفرض إرسال جميع حقول الهوية في جسم طلب التقديم بالعملية (submit/process)
// أي حقل غير مُرسل أو فارغ يُعدّ ناقصاً
function validateIdentityBodyComplete (identity = {}) {
  const missingKeys = IDENTITY_KEYS.filter(
    key => !isNonEmptyIdentityValue(identity[key])
  )

  if (!missingKeys.length) {
    return { error: null, missing_keys: [] }
  }

  const labels = missingKeys.map(key => IDENTITY_LABELS[key]).join('، ')

  return {
    error: `جميع بيانات الهوية مطلوبة في الطلب — الحقول الناقصة: ${labels}`,
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

// أحرف عربية ولاتينية فقط مع السماح بالمسافة للأسماء المركّبة (مثل: عبد الله)
const NAME_ALLOWED_PATTERN = /^[A-Za-z\u0621-\u064A\u0671-\u06D3]+(?:\s[A-Za-z\u0621-\u064A\u0671-\u06D3]+)*$/

const identityFieldSchema = Joi.string()
  .trim()
  .min(3)
  .max(100)
  .pattern(NAME_ALLOWED_PATTERN)
  .allow(null, '')
  .messages({
    'string.min': 'حقل {#label} يجب ألا يقل عن 3 أحرف',
    'string.max': 'حقل {#label} يجب ألا يتجاوز {#limit} حرف',
    'string.pattern.base':
      'حقل {#label} يجب أن يحتوي أحرفاً فقط (بدون أرقام أو رموز)'
  })

const nationalIdSchema = Joi.string()
  .trim()
  .allow(null, '')
  .pattern(/^[0-9]{11}$/)
  .messages({
    'string.pattern.base': 'رقم الهوية يجب أن يكون 11 رقماً بالضبط'
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
  validateIdentityBodyComplete,
  IDENTITY_KEYS,
  IDENTITY_LABELS
}
