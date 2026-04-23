const Joi = require('joi')

function ValidateCreateCalculation (data) {
    const schema = Joi.object({
        name: Joi.string().trim().min(2).max(100).required(),
        formula: Joi.string().trim().min(10).required(),
        result_field: Joi.string().required()
    })
    return schema.validate(data)
  }

function ValidateUpdateCalculation (data) {
  const schema = Joi.object({
    name: Joi.string().trim().min(2).max(100).optional(),
    formula: Joi.string().trim().min(10).optional(),
    result_field: Joi.string().allow('', null).optional(),
  }).or('name', 'formula', 'result_field')

  return schema.validate(data)
}

module.exports = {
  ValidateCreateCalculation,
  ValidateUpdateCalculation
}