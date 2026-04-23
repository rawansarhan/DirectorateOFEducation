const Joi = require('joi');

const ValidateCreateField = (data) => {
  const schema = Joi.object({
    field_name: Joi.string().trim().min(2).max(100).required(),

    field_type: Joi.string()
      .valid('string', 'number', 'text', 'date', 'boolean')
      .required(),

    list_json: Joi.alternatives().try(
      Joi.object(),
      Joi.array(),
      Joi.allow(null)
    )
  });

  return schema.validate(data);
};

const ValidateUpdateField = (data) => {
  const schema = Joi.object({
    field_name: Joi.string().trim().min(2).max(100).optional(),

    field_type: Joi.string()
      .valid('string', 'number', 'text', 'date', 'boolean')
      .optional(),

    list_json: Joi.alternatives().try(
      Joi.object(),
      Joi.array(),
      Joi.allow('', null)
    ).optional(),
  }).min(1); // لازم يكون في field واحد على الأقل

  return schema.validate(data);
};

module.exports = {
  ValidateCreateField,
  ValidateUpdateField
}