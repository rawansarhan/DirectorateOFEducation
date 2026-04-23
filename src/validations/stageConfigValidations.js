const Joi = require('joi')

const createStageConfigSchema = Joi.object({
  stage_id: Joi.number().required(),

  type: Joi.string().valid(
    'fields',
    'files',
    'rules',
    'document',
  ).required(),

  config_json: Joi.object().required(),

  priority: Joi.number().integer().min(1).optional()
})

module.exports = { createStageConfigSchema }