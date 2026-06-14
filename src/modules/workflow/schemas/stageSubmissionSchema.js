'use strict'

const Joi = require('joi')
const {
  buildStrictFormPayloadSchema,
  formatStrictFormJoiError
} = require('../services/unifiedFormPayloadService')
const {
  submitPayloadRootMessages,
  formatSubmitTransactionJoiError
} = require('./submitTransactionPayloadMessages')

const SUBMISSION_SCHEMA_VERSION = '1.0'

const submitTransactionPayloadSchema = buildStrictFormPayloadSchema({
  includeTemplates: true,
  includeExpectedVersion: true,
  allowSignature: true
})

function validateSubmitTransactionPayload (payload = {}) {
  const { error, value } = submitTransactionPayloadSchema.validate(payload, {
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

function buildSubmitContract (configJson = {}) {
  const { buildEmptyFormEnvelope } = require('../services/unifiedFormPayloadService')

  return {
    schema_version: SUBMISSION_SCHEMA_VERSION,
    envelope: buildEmptyFormEnvelope(configJson)
  }
}

module.exports = {
  SUBMISSION_SCHEMA_VERSION,
  validateSubmitTransactionPayload,
  submitTransactionPayloadSchema,
  buildSubmitContract
}
