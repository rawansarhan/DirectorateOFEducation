const Joi = require('joi')

function ValidateCreateTypeProcess(data) {
  const schema = Joi.object({
    name: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .required()
  })

  return schema.validate(data, {
    abortEarly: false,
    allowUnknown: false
  })
}

function ValidateUpdateTypeProcess(data) {
  const schema = Joi.object({
    name: Joi.string()
      .trim()
      .min(2)
      .max(100),

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