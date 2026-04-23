const Joi = require('joi')

const createStageSchema = Joi.object({
  process_definition_id: Joi.number().required(),
  name: Joi.string().min(2).max(100).required(),
  code: Joi.string().min(2).max(50).required(),
  type: Joi.string().valid(
    'USER_TASK',
    'APPROVAL',
    'SYSTEM_TASK',
    'DOCUMENT',
    'UPLOAD',
    'DECISION',
    'NOTIFICATION',
    'END'
  ).required(),
  order: Joi.number().integer().min(1).required(),
  organization_department_role_id : Joi.number()
})

module.exports = { createStageSchema }