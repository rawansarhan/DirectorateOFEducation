'use strict'

const Joi = require('joi')

const optionSchema = Joi.object({
  key: Joi.string()
    .trim()
    .min(1)
    .max(64)
    .required()
    .messages({
      'string.empty': 'key مطلوب لكل خيار',
      'any.required': 'key مطلوب لكل خيار'
    }),

  value: Joi.string()
    .trim()
    .min(1)
    .max(255)
    .required()
    .messages({
      'string.empty': 'value مطلوب لكل خيار',
      'any.required': 'value مطلوب لكل خيار'
    })
})

const textDropdownBodySchema = Joi.object({
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

  options: Joi.array()
    .items(optionSchema)
    .min(1)
    .required()
    .messages({
      'array.min': 'يجب إضافة خيار واحد على الأقل',
      'any.required': 'options مطلوب'
    })
}).messages({
  'object.unknown': 'الحقل {#label} غير مسموح به'
})

function validateUniqueOptionKeys (options = []) {
  const keys = options.map(option => option.key)
  const uniqueKeys = new Set(keys)

  if (uniqueKeys.size !== keys.length) {
    return 'مفاتيح الخيارات (key) يجب أن تكون فريدة'
  }

  return null
}

function validateCreateTextDropdown (data) {
  const { error, value } = textDropdownBodySchema.validate(data, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true
  })

  if (error) {
    return { error, value: null }
  }

  const uniqueKeysError = validateUniqueOptionKeys(value.options)

  if (uniqueKeysError) {
    return {
      error: {
        details: [{ message: uniqueKeysError }]
      },
      value: null
    }
  }

  return {
    error: null,
    value: {
      ...value,
      is_required: Boolean(value.is_required)
    }
  }
}

module.exports = {
  validateCreateTextDropdown
}
