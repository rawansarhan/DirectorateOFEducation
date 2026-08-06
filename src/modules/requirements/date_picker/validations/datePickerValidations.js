'use strict'

const Joi = require('joi')
const {
  resolveDateBound,
  compareDateOnly,
  serializeDateBound
} = require('../../../../core/utils/dateBound')

const dateOnlySchema = Joi.string()
  .trim()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .messages({
    'string.pattern.base': 'التاريخ يجب أن يكون بصيغة YYYY-MM-DD'
  })

const dateBoundSchema = Joi.alternatives()
  .try(
    dateOnlySchema,
    Joi.string().valid('today'),
    Joi.object({
      type: Joi.string().valid('today').required()
    }).unknown(false),
    Joi.object({
      type: Joi.string().valid('relative').required(),
      years: Joi.number().integer().default(0),
      months: Joi.number().integer().default(0),
      days: Joi.number().integer().default(0)
    }).unknown(false)
  )
  .messages({
    'alternatives.match':
      'حد التاريخ يجب أن يكون YYYY-MM-DD أو today أو كائن relative بالسنوات/الأشهر/الأيام'
  })

const datePickerBodySchema = Joi.object({
  label: Joi.string()
    .trim()
    .min(1)
    .max(255)
    .required()
    .messages({
      'string.empty': 'label مطلوب',
      'any.required': 'label مطلوب'
    }),

  is_required: Joi.boolean()
    .default(false),

  min_date: dateBoundSchema.required().messages({
    'any.required': 'min_date مطلوب'
  }),

  max_date: dateBoundSchema.required().messages({
    'any.required': 'max_date مطلوب'
  })
}).messages({
  'object.unknown': 'الحقل {#label} غير مسموح به'
})

function validateDateRange (minDate, maxDate) {
  try {
    const min = resolveDateBound(minDate)
    const max = resolveDateBound(maxDate)

    if (compareDateOnly(min, max) > 0) {
      return 'min_date يجب أن يكون قبل أو يساوي max_date'
    }

    return null
  } catch (_) {
    return 'تاريخ غير صالح'
  }
}

function validateCreateDatePicker (data) {
  const { error, value } = datePickerBodySchema.validate(data, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true
  })

  if (error) {
    return { error, value: null }
  }

  const rangeError = validateDateRange(value.min_date, value.max_date)

  if (rangeError) {
    return {
      error: {
        details: [{ message: rangeError }]
      },
      value: null
    }
  }

  return {
    error: null,
    value: {
      ...value,
      is_required: Boolean(value.is_required),
      min_date: serializeDateBound(value.min_date),
      max_date: serializeDateBound(value.max_date)
    }
  }
}

module.exports = {
  validateCreateDatePicker
}
