'use strict'

const Joi = require('joi')
const { taskDecisionSchema } = require('./signingChallengeSchema')

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

const completeTaskPayloadSchema = Joi.object({
  stage_name: Joi.string().max(256).optional(),
  variables: Joi.object({
    decision: Joi.string().min(1).max(128).required()
  }).required().unknown(false),
  decision: taskDecisionSchema.when('signature', {
    is: Joi.exist(),
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  signature: Joi.object({
    challenge_id: Joi.string().uuid().required(),
    signature: Joi.string().min(16).required()
  }).optional(),
  expected_version: Joi.number().integer().min(0).optional(),
  fields: Joi.array().items(fieldItemSchema).default([]),
  files: Joi.array().items(fileItemSchema).default([]),
  templates: Joi.array().items(templateItemSchema).default([]),
  actions: Joi.array().items(actionItemSchema).default([]),
  notes: Joi.string().max(10000).allow('', null).optional(),
  idempotency_key: Joi.string().uuid().optional()
}).unknown(false)

function validateCompleteTaskPayload (payload = {}) {
  const { error, value } = completeTaskPayloadSchema.validate(payload, {
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

module.exports = {
  completeTaskPayloadSchema,
  validateCompleteTaskPayload
}
