const Joi = require('joi')

function ValidateCreateOrganization(data) {
  const schema = Joi.object({
    name: Joi.string()
      .trim()
      .min(2)
      .max(150)
      .required(),

    parent_id: Joi.number()
      .integer()
      .positive()
      .allow(null),

    location_id: Joi.number()
      .integer()
      .positive()
      .allow(null)
  })

  return schema.validate(data, {
    abortEarly: false,
    allowUnknown: false
  })
}

function ValidateUpdateOrganization(data) {
  const schema = Joi.object({
    name: Joi.string()
      .trim()
      .min(2)
      .max(150),

    parent_id: Joi.number()
      .integer()
      .positive()
      .allow(null),

    location_id: Joi.number()
      .integer()
      .positive()
      .allow(null)
  }).min(1)

  return schema.validate(data, {
    abortEarly: false,
    allowUnknown: false
  })
}

module.exports = {
  ValidateCreateOrganization,
  ValidateUpdateOrganization
}
