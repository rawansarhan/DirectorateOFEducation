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

    password: Joi.string()
      .min(6)
      .pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)
      .required()
      .messages({
        'string.pattern.base': 'password must contain letters and numbers'
      }),

    organization_id: Joi.number().integer().positive().required(),

    department_id: Joi.number().integer().positive().required(),

    role_id: Joi.number().integer().positive().required()
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

module.exports = {
  validateRegisterEmp,
  validateRegisterCitizen,
  validateLogin,
  validateVerifyOtp,
}