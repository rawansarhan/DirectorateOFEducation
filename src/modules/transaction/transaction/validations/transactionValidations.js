'use strict'

const Joi = require('joi')

function parsePositiveInt (value, label) {
  const numeric = Number(value)

  if (!Number.isInteger(numeric) || numeric < 1) {
    throw new Error(`${label} غير صالح`)
  }

  return numeric
}

const draftBodySchema = Joi.object()
  .unknown(true)

function validateDraftBody (data = {}) {
  const { error, value } = draftBodySchema.validate(data, {
    abortEarly: false
  })

  if (error) {
    return {
      error: error.details.map(d => d.message).join(' | '),
      value: null
    }
  }

  return { error: null, value }
}

module.exports = {
  parsePositiveInt,
  validateDraftBody
}
