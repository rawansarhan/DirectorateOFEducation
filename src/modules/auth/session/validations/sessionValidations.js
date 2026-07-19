const Joi = require('joi')
const {
  userNameMessages,
  passwordMessages,
} = require('../../shared/validations/authValidationMessages')

function validateLogin (data) {
  const schema = Joi.object({
    userName: Joi.string()
      .trim()
      .min(3)
      .max(50)
      .required()
      .messages(userNameMessages),

    password: Joi.string()
      .min(6)
      .required()
      .messages(passwordMessages)
  }).messages({
    'object.unknown': 'الحقل {#label} غير مسموح به'
  })

  return schema.validate(data, {
    abortEarly: false,
    allowUnknown: false
  })
}

function validateVerifyOtp (data) {
  const schema = Joi.object({
    session_id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.base': 'معرّف الجلسة يجب أن يكون نصاً',
        'string.empty': 'معرّف الجلسة مطلوب',
        'string.guid': 'معرّف الجلسة غير صالح',
        'any.required': 'معرّف الجلسة مطلوب'
      }),

    otp: Joi.string()
      .length(6)
      .pattern(/^\d+$/)
      .required()
      .messages({
        'string.base': 'رمز التحقق يجب أن يكون نصاً',
        'string.empty': 'رمز التحقق مطلوب',
        'string.length': 'رمز التحقق يجب أن يتكون من 6 أرقام',
        'string.pattern.base': 'رمز التحقق يجب أن يحتوي على أرقام فقط',
        'any.required': 'رمز التحقق مطلوب'
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

function validateRefreshToken (data) {
  const schema = Joi.object({
    refreshToken: Joi.string().trim().required().messages({
      'string.base': 'refresh token يجب أن يكون نصاً',
      'string.empty': 'refresh token مطلوب',
      'any.required': 'refresh token مطلوب'
    })
  })

  return schema.validate(data, { abortEarly: false })
}

function validateResendOtp (data) {
  const schema = Joi.object({
    session_id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.base': 'معرّف الجلسة يجب أن يكون نصاً',
        'string.empty': 'معرّف الجلسة مطلوب',
        'string.guid': 'معرّف الجلسة غير صالح',
        'any.required': 'معرّف الجلسة مطلوب'
      })
  })

  return schema.validate(data, { abortEarly: false })
}

module.exports = {
  validateLogin,
  validateVerifyOtp,
  validateDeviceToken,
  validateRefreshToken,
  validateResendOtp,
}
