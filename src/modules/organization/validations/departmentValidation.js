const Joi = require('joi')

function ValidateCreateDepartment(data) {
  const schema = Joi.object({
    name: Joi.string()
      .trim()
      .min(2)
      .max(150)
      .required(),

    organization_id: Joi.number()
      .integer()
      .positive()
      .required(),

    parent_id: Joi.number()
      .integer()
      .positive()
      .allow(null),

    is_active: Joi.boolean()
  })

  return schema.validate(data, {
    abortEarly: false,
    allowUnknown: false
  })
}

function ValidateUpdateDepartment(data) {
  const schema = Joi.object({
    name: Joi.string()
      .trim()
      .min(2)
      .max(150),

    organization_id: Joi.number()
      .integer()
      .positive(),

    parent_id: Joi.number()
      .integer()
      .positive()
      .allow(null),

    is_active: Joi.boolean()
  }).min(1)

  return schema.validate(data, {
    abortEarly: false,
    allowUnknown: false
  })
}

module.exports = {
  ValidateCreateDepartment,
  ValidateUpdateDepartment
}
