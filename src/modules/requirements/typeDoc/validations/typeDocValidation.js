'use strict'

const Joi = require('joi')

const createTypeDocSchema = Joi.object({
  name: Joi.string().trim().min(1).max(256).required().messages({
    'any.required': 'اسم نوع الوثيقة مطلوب',
    'string.min': 'اسم نوع الوثيقة مطلوب'
  })
}).unknown(false)

const updateTypeDocSchema = Joi.object({
  name: Joi.string().trim().min(1).max(256).optional(),
  is_active: Joi.boolean().optional()
})
  .min(1)
  .unknown(false)

function validateCreateTypeDoc (data = {}) {
  return createTypeDocSchema.validate(data, { abortEarly: false })
}

function validateUpdateTypeDoc (data = {}) {
  return updateTypeDocSchema.validate(data, { abortEarly: false })
}

module.exports = {
  validateCreateTypeDoc,
  validateUpdateTypeDoc
}
