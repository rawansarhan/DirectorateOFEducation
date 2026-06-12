const Joi = require('joi')

function ValidateCreateTypeProcess (data) {
  const schema = Joi.object({
    name: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .required(),
    code: Joi.string()
      .trim()
      .uppercase()
      .pattern(/^[A-Z0-9_]{2,20}$/)
      .required()
      .messages({
        'string.pattern.base': 'code يجب أن يكون 2-20 حرفاً (A-Z, 0-9, _)',
        'any.required': 'code مطلوب'
      })
  })

  return schema.validate(data, {
    abortEarly: false,
    allowUnknown: false
  })
}

function ValidateUpdateTypeProcess(data) {
  const schema = Joi.object({
    is_active: Joi.boolean()
  }).min(1)

  return schema.validate(data, {
    abortEarly: false,
    allowUnknown: false
  })
}
module.exports = {
  ValidateCreateTypeProcess,
  ValidateUpdateTypeProcess
}