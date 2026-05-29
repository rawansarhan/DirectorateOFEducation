const Joi = require('joi')

const createStageConfigSchema = Joi.object({

  stages: Joi.array().items(

    Joi.object({

      stage_id: Joi.number().required(),

      config_json: Joi.object().required(),

      assignments: Joi.array().items(

        Joi.object({

      
    organization_id: Joi.number()
      .allow(null)
      .required(),

    department_id: Joi.number()
      .allow(null)
      .required(),

    role_id: Joi.number()
      .required()

        })

      ).optional()

    })

  ).required()

})

module.exports = {
  createStageConfigSchema
}