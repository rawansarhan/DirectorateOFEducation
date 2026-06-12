'use strict'

const Joi = require('joi')
const { submissionFileItemSchema } = require('./submissionFileSchema')

const fieldItemSchema = Joi.object({
  key: Joi.string().max(128).required(),
  value: Joi.any().allow(null, '')
})

const documentSubmitSigningChallengeSchema = Joi.object({
  pin: Joi.string()
    .length(6)
    .pattern(/^\d+$/)
    .required()
    .messages({
      'string.length': 'رمز PIN يجب أن يتكون من 6 أرقام',
      'string.pattern.base': 'رمز PIN يجب أن يحتوي على أرقام فقط',
      'any.required': 'رمز PIN مطلوب'
    })
}).unknown(false)

const documentSubmitFileSchema = submissionFileItemSchema

const documentSubmitCompleteSchema = Joi.object({
  stage_name: Joi.string().trim().min(1).max(256).required().messages({
    'any.required': 'stage_name مطلوب — اسم المرحلة الحالية',
    'string.min': 'stage_name مطلوب — اسم المرحلة الحالية'
  }),
  decision: Joi.string().valid('approve').required().messages({
    'any.only': 'decision يجب أن يكون approve فقط في تقديم الوثائق',
    'any.required': 'decision مطلوب — استخدم approve'
  }),
  fields: Joi.array()
    .items(fieldItemSchema)
    .default([]),
  signature: Joi.object({
    challenge_id: Joi.string().uuid(),
    signing_id: Joi.string().uuid(),
    signature: Joi.string().min(16).required()
  })
    .or('challenge_id', 'signing_id')
    .required()
    .messages({
      'any.required':
        'التوقيع الرقمي مطلوب — أنشئ تحدي التوقيع أولاً عبر POST /tasks/{taskId}/submit-documents/signing-challenge'
    }),
  expected_version: Joi.number().integer().min(0).optional(),
  files: Joi.array().items(documentSubmitFileSchema).min(1).required().messages({
    'array.min': 'files مطلوب — أرفق ملفاً واحداً على الأقل مع type_doc_id لكل ملف'
  }),
  note: Joi.string().max(10000).allow('', null).optional()
}).unknown(false)

function validateDocumentSubmitSigningChallenge (payload = {}) {
  const { error, value } = documentSubmitSigningChallengeSchema.validate(payload, {
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

function validateDocumentSubmitComplete (payload = {}) {
  const { error, value } = documentSubmitCompleteSchema.validate(payload, {
    abortEarly: false,
    stripUnknown: true
  })

  if (error) {
    return {
      value: null,
      error: error.details.map(d => d.message).join('; ')
    }
  }

  const signature = {
    challenge_id: value.signature.challenge_id || value.signature.signing_id,
    signature: value.signature.signature
  }

  return {
    value: {
      ...value,
      signature,
      note: value.note ?? '',
      fields: value.fields || []
    },
    error: null
  }
}

module.exports = {
  validateDocumentSubmitSigningChallenge,
  validateDocumentSubmitComplete
}
