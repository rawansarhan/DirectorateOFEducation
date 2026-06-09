'use strict'

const Joi = require('joi')
const { IDENTITY_KEYS } = require('../dto/TransactionDraftInputDTO')

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
  .messages({
    'string.max': 'رقم الهوية يتجاوز الحد المسموح ({#limit} حرف)'
  })

const draftBodySchema = Joi.object({
  first_name: identityFieldSchema.label('الاسم الأول'),
  last_name: identityFieldSchema.label('اسم العائلة'),
  father_name: identityFieldSchema.label('اسم الأب'),
  mother_name: identityFieldSchema.label('اسم الأم'),
  national_id: nationalIdSchema
})
  .unknown(true)

function validateDraftBody (data = {}) {
  const { error, value } = draftBodySchema.validate(data, {
    abortEarly: false,
    stripUnknown: false
  })

  if (error) {
    return {
      error: error.details.map(d => d.message).join(' | '),
      value: null
    }
  }

  return { error: null, value }
}

function hasDraftPayload (data) {
  if (!data || typeof data !== 'object') {
    return false
  }

  return Object.keys(data).length > 0
}

module.exports = {
  parsePositiveInt,
  validateDraftBody,
  hasDraftPayload,
  IDENTITY_KEYS
}
