const Joi = require('joi')

const createDocumentTemplateValidation = data => {

  const schema = Joi.object({

    name: Joi.string().required(),

    file_type: Joi.string()
      .valid('pdf', 'docx', 'html')
      .required(),

    config_json: Joi.any().optional(),

    file_path: Joi.string().required()
  })

  return schema.validate(data)
}

const updateDocumentTemplateValidation = data => {
  const schema = Joi.object({
    name: Joi.string().optional(),

    file_type: Joi.string()
      .valid('pdf', 'docx', 'html')
      .optional(),

    engine_type: Joi.string()
      .valid('ACROFORM', 'POSITIONED')
      .optional(),

    config_json: Joi.any().optional(),
    file_path: Joi.string().required()


  })

  return schema.validate(data)
}

module.exports = {
  createDocumentTemplateValidation,
  updateDocumentTemplateValidation
}