const Joi = require('joi')

const createProcessDefinitionSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  code: Joi.string().optional(),
  file_BPMN:Joi.string().required(),
  type_trans_id: Joi.number().required(),
  organization_id: Joi.number().optional(),
  priority: Joi.number().required(),
  start_date:Joi.date().required(),
  end_date:Joi.date()
})

module.exports = { createProcessDefinitionSchema }