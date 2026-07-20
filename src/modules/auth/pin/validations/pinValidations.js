const Joi = require('joi')

function validateSetupPin (data) {
  const schema = Joi.object({
    pin: Joi.string().length(6).pattern(/^\d+$/).required().messages({
      'string.length': 'pin must be 6 digits',
      'string.pattern.base': 'pin must contain digits only'
    }),
    confirm_pin: Joi.string().valid(Joi.ref('pin')).required().messages({
      'any.only': 'confirm_pin must match pin'
    })
  })

  return schema.validate(data, { abortEarly: false })
}

function validateVerifyAppPin (data) {
  const schema = Joi.object({
    pin: Joi.string().length(6).pattern(/^\d+$/).required().messages({
      'string.length': 'pin must be 6 digits',
      'string.pattern.base': 'pin must contain digits only'
    })
  })

  return schema.validate(data, { abortEarly: false })
}

function validateChangePin (data) {
  const schema = Joi.object({
    old_pin: Joi.string().length(6).pattern(/^\d+$/).required().messages({
      'string.length': 'old_pin must be 6 digits',
      'string.pattern.base': 'old_pin must contain digits only'
    }),
    new_pin: Joi.string().length(6).pattern(/^\d+$/).required().messages({
      'string.length': 'new_pin must be 6 digits',
      'string.pattern.base': 'new_pin must contain digits only'
    }),
    confirm_new_pin: Joi.string().valid(Joi.ref('new_pin')).required().messages({
      'any.only': 'confirm_new_pin must match new_pin'
    })
  })

  const { error, value } = schema.validate(data, { abortEarly: false })

  if (error) {
    return { error, value }
  }

  if (value.old_pin === value.new_pin) {
    return {
      error: {
        details: [{ message: 'new_pin must be different from old_pin' }]
      },
      value
    }
  }

  return { error: null, value }
}

function validateDeletePin (data) {
  const schema = Joi.object({
    pin: Joi.string().length(6).pattern(/^\d+$/).required().messages({
      'string.length': 'pin must be 6 digits',
      'string.pattern.base': 'pin must contain digits only'
    })
  })

  return schema.validate(data, { abortEarly: false })
}

module.exports = {
  validateSetupPin,
  validateVerifyAppPin,
  validateChangePin,
  validateDeletePin,
  validateChangeCitizenPin: validateChangePin,
}
