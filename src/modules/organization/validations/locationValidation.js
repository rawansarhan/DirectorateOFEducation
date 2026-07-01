const Joi = require('joi')

function ValidateCreateLocation(data) {
  const schema = Joi.object({
    name: Joi.string()
      .trim()
      .min(2)
      .max(150)
      .required(),

    typeLocation_id: Joi.number()
      .integer()
      .positive()
      .required(),

    parent_id: Joi.number()
      .integer()
      .positive()
      .allow(null)
  })

  return schema.validate(data, {
    abortEarly: false,
    allowUnknown: false
  })
}

module.exports = {
  ValidateCreateLocation
}
