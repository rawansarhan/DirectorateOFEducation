const Joi = require('joi')

function ValidateCreateRole(data) {
  const schema = Joi.object({
    name: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .required(),

    code: Joi.string()
      .trim()
      .pattern(/^[A-Z0-9_]+$/)
      .min(2)
      .max(100)
      .required()
      .messages({
        'string.pattern.base': 'يجب أن يحتوي الـ code على أحرف إنجليزية كبيرة وأرقام وشرطة سفلية فقط'
      }),

    organization_id: Joi.number()
      .integer()
      .positive()
      .required(),

    department_id: Joi.number()
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

function ValidateUpdateRole(data) {
  const schema = Joi.object({
    organization_id: Joi.number()
      .integer()
      .positive(),

    department_id: Joi.number()
      .integer()
      .positive(),

    parent_id: Joi.number()
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
  ValidateCreateRole,
  ValidateUpdateRole
}
