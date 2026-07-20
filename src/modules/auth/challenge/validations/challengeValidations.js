const Joi = require('joi')
const {
  userNameMessages,
  passwordMessages,
} = require('../../shared/validations/authValidationMessages')

function validateEmployeeVerifyPin (data) {
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
  validateEmployeeVerifyPin,
  validateCreateChallenge,
  validateVerifySignature,
}
