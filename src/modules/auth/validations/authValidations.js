const Joi = require('joi')

// =======================================
// validate register employee
// =======================================
function validateRegisterEmp (data) {
  const schema = Joi.object({
    userName: Joi.string()
      .trim()
      .min(3)
      .max(50)
      .pattern(/^\S+$/)
      .required()
      .messages({
        'string.pattern.base': 'userName must not contain spaces'
      }),

    email: Joi.string()
      .email()
      .lowercase()
      .required(),

    phone_number: Joi.string()
      .pattern(/^09\d{8}$/)
      .required()
      .messages({
        'string.pattern.base': 'phone_number must start with 09 and be 10 digits'
      }),

    pin: Joi.string()
      .length(6)
      .pattern(/^\d+$/)
      .required()
      .messages({
        'string.length': 'pin must be 6 digits',
        'string.pattern.base': 'pin must contain digits only'
      }),

    organization_id: Joi.number().integer().positive().required(),

    department_id: Joi.number().integer().positive().required(),

    role_id: Joi.number().integer().positive().required(),

    public_key: Joi.string().trim().min(40).required().messages({
      'any.required': 'public_key is required (generated in browser)'
    })
  })

  return schema.validate(data, {
    abortEarly: false,
    allowUnknown: false
  })
}

// ===========================================
// validate register citizen
// ===========================================
function validateRegisterCitizen (data) {
  const schema = Joi.object({
    userName: Joi.string()
      .trim()
      .min(3)
      .max(50)
      .pattern(/^\S+$/)
      .required()
      .messages({
        'string.pattern.base': 'userName must not contain spaces'
      }),

    email: Joi.string()
      .email()
      .lowercase()
      .required(),

    phone_number: Joi.string()
      .pattern(/^09\d{8}$/)
      .required()
      .messages({
        'string.pattern.base': 'phone_number must start with 09 and be 10 digits'
      }),

    password: Joi.string()
      .min(6)
      .pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)
      .required()
  })

  return schema.validate(data, {
    abortEarly: false,
    allowUnknown: false
  })
}

// ===========================================
// validate login
// ===========================================
function validateLogin (data) {
  const schema = Joi.object({
    userName: Joi.string()
      .trim()
      .min(3)
      .max(50)
      .required(),

    password: Joi.string()
      .min(6)
      .required()
  })

  return schema.validate(data, {
    abortEarly: false,
    allowUnknown: false
  })
}

// ===========================================
// validate verify OTP
// ===========================================
function validateVerifyOtp(data) {
  const schema = Joi.object({
    session_id: Joi.string().uuid().required(),
    otp: Joi.string().length(6).pattern(/^\d+$/).required().messages({
      'string.length': 'otp must be 6 digits',
      'string.pattern.base': 'otp must contain digits only'
    })
  })
  return schema.validate(data, { abortEarly: false })
}

function validateDeviceToken (data) {
  const schema = Joi.object({
    fcm_token: Joi.string().trim().min(20).required(),
    platform: Joi.string().valid('android', 'ios', 'web').optional(),
    device_id: Joi.string().trim().max(255).optional()
  })

  return schema.validate(data, {
    abortEarly: false,
    allowUnknown: false
  })
}

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

function validateEmployeeVerifyPin (data) {
  const schema = Joi.object({
    userName: Joi.string().trim().min(3).max(50).required(),
    pin: Joi.string().length(6).pattern(/^\d+$/).required()
  })

  return schema.validate(data, { abortEarly: false })
}

function validateCreateChallenge (data) {
  const schema = Joi.object({
    pin_session_id: Joi.string().uuid().required()
  })

  return schema.validate(data, { abortEarly: false })
}

function validateVerifySignature (data) {
  const schema = Joi.object({
    challenge_id: Joi.string().uuid().required(),
    signature: Joi.string().trim().min(20).required()
  })

  return schema.validate(data, { abortEarly: false })
}

module.exports = {
  validateRegisterEmp,
  validateRegisterCitizen,
  validateLogin,
  validateVerifyOtp,
  validateDeviceToken,
  validateSetupPin,
  validateVerifyAppPin,
  validateChangePin,
  validateChangeCitizenPin: validateChangePin,
  validateEmployeeVerifyPin,
  validateCreateChallenge,
  validateVerifySignature,
}