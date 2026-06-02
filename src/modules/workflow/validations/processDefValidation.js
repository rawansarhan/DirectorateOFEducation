const Joi = require('joi')

const today = new Date()
today.setHours(0, 0, 0, 0)

const createProcessDefinitionSchema = Joi.object({
  name: Joi.string()
    .min(3)
    .max(100)
    .required(),

  code: Joi.string().required(),

  filePath: Joi.string().required(),

  is_complaint: Joi.boolean().default(false),

  // مطلوب فقط للمعاملات العادية — null تلقائياً عند الشكوى
  type_trans_id: Joi.when('is_complaint', {
    is: true,
    then: Joi.valid(null).optional(),
    otherwise: Joi.number().integer().required()
  }),

  organization_id: Joi.number()
    .integer(),

  priority: Joi.number()
    .integer()
    .min(1)
    .required(),

  start_date: Joi.date()
    .min(today)
    .allow(null)
    .messages({
      'date.base': 'start_date يجب أن يكون تاريخ صحيح',
      'date.min': 'start_date يجب أن يكون من اليوم أو بعده'
    }),

  end_date: Joi.date()
    .min(Joi.ref('start_date'))
    .greater(Joi.ref('start_date'))
    .allow(null)
    .messages({
      'date.base': 'end_date يجب أن يكون تاريخ صحيح',
      'date.min': 'end_date يجب أن يكون بعد start_date',
      'date.greater': 'end_date يجب أن يكون أكبر من start_date'
    })
})

function validateProcess (process) {
  let is_valid = true
  const errors = []

  if (process.status !== 'deployed') {
    is_valid = false
    errors.push('يجب نشر العملية أولاً (deployed)')
  }

  if (!process.stages?.length) {
    is_valid = false
    errors.push('لا يوجد مراحل للعملية')
  }

  const authStages = process.stages.filter(s => s.auth_type === 'AUTH')

  if (authStages.length === 0) {
    is_valid = false
    errors.push('يجب وجود مرحلة AUTH واحدة')
  }

  if (authStages.length > 1) {
    is_valid = false
    errors.push('يوجد أكثر من مرحلة AUTH')
  }

  for (const stage of process.stages) {
    if (!stage.type) {
      is_valid = false
      errors.push(`Stage ${stage.id} لا يحتوي على type`)
    }

    if (!stage.stage_config) {
      is_valid = false
      errors.push(`Stage ${stage.name} لا يحتوي على config`)
    }

    if (stage.type === 'USER_TASK') {
      if (!stage.stage_assignments?.length) {
        is_valid = false
        errors.push(`Stage ${stage.name} يجب أن يحتوي على assignments`)
      }

      for (const assignment of stage.stage_assignments) {
        const role = assignment.organization_department_role

        if (!role) {
          is_valid = false
          errors.push(`Stage ${stage.name} يحتوي role غير موجود`)
        }

        if (role && !role.is_active) {
          is_valid = false
          errors.push(`Stage ${stage.name} يحتوي role غير فعال`)
        }
      }
    }
  }

  return { is_valid, errors }
}

module.exports = { createProcessDefinitionSchema, validateProcess }
