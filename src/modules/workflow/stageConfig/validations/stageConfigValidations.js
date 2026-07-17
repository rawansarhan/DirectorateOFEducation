const Joi = require('joi')
const { stageConfigJsonSchema } = require('./stageConfigSchema')

const stageAssignmentItemSchema = Joi.object({
  organization_id: Joi.number().integer().positive().allow(null).required(),
  department_id: Joi.number().integer().positive().allow(null).required(),
  role_id: Joi.number().integer().positive().allow(null).required()
}).unknown(false)

const createStageConfigSchema = Joi.object({
  stages: Joi.array().items(
    Joi.object({
      stage_id: Joi.number().required(),
      config_json: stageConfigJsonSchema.required(),
      assignments: Joi.array().items(stageAssignmentItemSchema).optional()
    })
  ).required()
})

module.exports = {
  createStageConfigSchema,
  stageAssignmentItemSchema
}
