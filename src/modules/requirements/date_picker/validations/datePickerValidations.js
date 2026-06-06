'use strict'

const Joi = require('joi')

const dateOnlySchema = Joi.string()
  .trim()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .required()
  .messages({
    'string.pattern.base': 'التاريخ يجب أن يكون بصيغة YYYY-MM-DD',
    'any.required': 'التاريخ مطلوب'
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

  min_date: dateOnlySchema.messages({
    'any.required': 'min_date مطلوب'
  }),

  max_date: dateOnlySchema.messages({
    'any.required': 'max_date مطلوب'
  })
}).messages({
  'object.unknown': 'الحقل {#label} غير مسموح به'
})

function validateDateRange (minDate, maxDate) {
  const min = new Date(`${minDate}T00:00:00Z`)
  const max = new Date(`${maxDate}T00:00:00Z`)

  if (Number.isNaN(min.getTime()) || Number.isNaN(max.getTime())) {
    return 'تاريخ غير صالح'
  }

  if (min > max) {
    return 'min_date يجب أن يكون قبل أو يساوي max_date'
  }

  return null
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
      is_required: Boolean(value.is_required)
    }
  }
}

module.exports = {
  validateCreateDatePicker
}
