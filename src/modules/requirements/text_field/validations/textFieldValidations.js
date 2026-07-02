'use strict'

const Joi = require('joi')

const INPUT_TYPES = ['text', 'string', 'int', 'phoneNumber', 'email']

function assertValidRegexPattern (regex) {
  if (regex === null || regex === undefined || regex === '') {
    return null
  }

  try {
    // eslint-disable-next-line no-new
    new RegExp(regex)
    return String(regex)
  } catch (error) {
    return null
  }
}

function validateLengthRange (minLength, maxLength) {
  if (
    minLength != null &&
    maxLength != null &&
    Number(minLength) > Number(maxLength)
  ) {
    return 'min_length يجب أن يكون أقل من أو يساوي max_length'
  }

  return null
}

const textFieldBodySchema = Joi.object({
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

  input_type: Joi.string()
    .valid(...INPUT_TYPES)
    .required()
    .messages({
      'any.only': `input_type يجب أن يكون أحد: ${INPUT_TYPES.join(', ')}`,
      'any.required': 'input_type مطلوب'
    }),

  regex: Joi.string()
    .trim()
    .max(500)
    .allow(null, '')
    .optional(),

  max_length: Joi.number()
    .integer()
    .min(1)
    .allow(null)
    .optional(),

  min_length: Joi.number()
    .integer()
    .min(0)
    .allow(null)
    .optional()
}).messages({
  'object.unknown': 'الحقل {#label} غير مسموح به'
})

function validateCreateTextField (data) {
  const { error, value } = textFieldBodySchema.validate(data, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true
  })

  if (error) {
    return { error, value: null }
  }

  const normalizedRegex = assertValidRegexPattern(value.regex)

  if (value.regex && normalizedRegex === null) {
    return {
      error: {
        details: [{ message: 'regex غير صالح' }]
      },
      value: null
    }
  }

  const lengthError = validateLengthRange(value.min_length, value.max_length)

  if (lengthError) {
    return {
      error: {
        details: [{ message: lengthError }]
      },
      value: null
    }
  }

  return {
    error: null,
    value: {
      ...value,
      regex: normalizedRegex,
      is_required: Boolean(value.is_required)
    }
  }
}

module.exports = {
  INPUT_TYPES,
  validateCreateTextField
}
