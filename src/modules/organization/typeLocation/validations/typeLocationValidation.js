const Joi = require('joi')

function ValidateCreateTypeLocation (data) {
  const schema = Joi.object({
    name: Joi.string()
      .trim()
      .min(2)
      .max(150)
      .required()
  })

  return schema.validate(data, {
    abortEarly: false,
    allowUnknown: false
  })
}

module.exports = {
  ValidateCreateTypeLocation
}
