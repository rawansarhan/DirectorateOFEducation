const Joi = require('joi')
const {
  parseMonthDayToCurrentYearDate
} = require('../utils/processDefinitionDates')
const { monthDayFromDate } = require('../utils/processActivation')

const monthDayPattern = /^\d{1,2}-\d{1,2}$/

function requiredMonthDaySchema (fieldName) {
  return Joi.string()
    .trim()
    .pattern(monthDayPattern)
    .required()
    .messages({
      'string.pattern.base': `${fieldName} يجب أن يكون بصيغة MM-DD (شهر-يوم)`,
      'any.required': `${fieldName} مطلوب`,
      'any.custom': '{{#message}}'
    })
    .custom((value, helpers) => {
      try {
        return parseMonthDayToCurrentYearDate(value, fieldName)
      } catch (err) {
        return helpers.error('any.custom', { message: err.message })
      }
    })
}

function optionalMonthDaySchema (fieldName) {
  return Joi.string()
    .trim()
    .allow(null, '')
    .optional()
    .messages({
      'any.custom': '{{#message}}'
    })
    .custom((value, helpers) => {
      if (value === null || value === '') {
        return null
      }

      if (!monthDayPattern.test(value)) {
        return helpers.error('any.custom', {
          message: `${fieldName} يجب أن يكون بصيغة MM-DD (شهر-يوم)`
        })
      }

      try {
        return parseMonthDayToCurrentYearDate(value, fieldName)
      } catch (err) {
        return helpers.error('any.custom', { message: err.message })
      }
    })
}

const createProcessDefinitionSchema = Joi.object({
  name: Joi.string()
    .min(3)
    .max(100)
    .required()
    .messages({
      'string.min': 'name يجب أن يكون 3 أحرف على الأقل',
      'string.max': 'name يجب ألا يتجاوز 100 حرف',
      'any.required': 'name مطلوب',
      'string.empty': 'name مطلوب'
    }),

  filePath: Joi.string()
    .required()
    .messages({
      'any.required': 'filePath مطلوب',
      'string.empty': 'ملف BPMN مطلوب'
    }),

  is_complaint: Joi.boolean().default(false),

  type_trans_id: Joi.when('is_complaint', {
    is: true,
    then: Joi.valid(null).optional(),
    otherwise: Joi.number()
      .integer()
      .required()
      .messages({
        'any.required': 'type_trans_id مطلوب عندما is_complaint = false',
        'number.base': 'type_trans_id يجب أن يكون رقماً صحيحاً',
        'number.integer': 'type_trans_id يجب أن يكون رقماً صحيحاً'
      })
  }),

  organization_id: Joi.number()
    .integer()
    .required()
    .messages({
      'any.required': 'organization_id مطلوب',
      'number.base': 'organization_id يجب أن يكون رقماً صحيحاً',
      'number.integer': 'organization_id يجب أن يكون رقماً صحيحاً'
    }),

  priority: Joi.number()
    .integer()
    .valid(1, 2, 3)
    .required()
    .messages({
      'any.required': 'priority مطلوب',
      'number.base': 'priority يجب أن يكون رقماً صحيحاً',
      'number.integer': 'priority يجب أن يكون رقماً صحيحاً',
      'any.only': 'priority يجب أن يكون 1 (عالي) أو 2 (متوسط) أو 3 (منخفض)'
    }),

  start_date: requiredMonthDaySchema('start_date'),

  end_date: optionalMonthDaySchema('end_date')
}).messages({
  'any.custom': '{{#message}}'
}).custom((value, helpers) => {
  if (!value.end_date || !value.start_date) {
    return value
  }

  const start = monthDayFromDate(value.start_date)
  const end = monthDayFromDate(value.end_date)

  if (
    start.month === end.month &&
    start.day === end.day
  ) {
    return helpers.error('any.custom', {
      message: 'end_date يجب أن يختلف عن start_date'
    })
  }

  return value
})


//////////////////////////////////////////////////////////////////////////////////////

function validateProcess (process) {

  let is_valid = true

  const errors = []

  // STATUS

  if (process.status !== 'deployed') {

    is_valid = false

    errors.push(
      'يجب نشر العملية أولاً (deployed)'
    )
  }

  // STAGES

  if (!process.stages?.length) {

    is_valid = false

    errors.push(
      'لا يوجد مراحل للعملية'
    )
  }

  // AUTH STAGE

  const authStages =
    process.stages.filter(
      s => s.auth_type === 'AUTH'
    )

  if (authStages.length === 0) {

    is_valid = false

    errors.push(
      'يجب وجود مرحلة AUTH واحدة'
    )
  }

  if (authStages.length > 1) {

    is_valid = false

    errors.push(
      'يوجد أكثر من مرحلة AUTH'
    )
  }

  // STAGES VALIDATION

  for (const stage of process.stages) {

    if (!stage.type) {

      is_valid = false

      errors.push(
        `Stage ${stage.id} لا يحتوي على type`
      )
    }

    if (!stage.stage_config) {

      is_valid = false

      errors.push(
        `Stage ${stage.name} لا يحتوي على config`
      )
    }

    if (stage.type === 'USER_TASK') {

      if (!stage.stage_assignments?.length) {

        is_valid = false

        errors.push(
          `Stage ${stage.name} يجب أن يحتوي على assignments`
        )
      }

      for (const assignment of stage.stage_assignments) {

        const role =
          assignment.organization_department_role

        if (!role) {

          is_valid = false

          errors.push(
            `Stage ${stage.name} يحتوي role غير موجود`
          )
        }

        if (role && !role.is_active) {

          is_valid = false

          errors.push(
            `Stage ${stage.name} يحتوي role غير فعال`
          )
        }
      }
    }
  }

  return {
    is_valid,
    errors
  }
}

module.exports = { createProcessDefinitionSchema, validateProcess }
