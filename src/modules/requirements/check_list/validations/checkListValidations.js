'use strict'

const Joi = require('joi')

const optionSchema = Joi.object({
  key: Joi.string()
    .trim()
    .min(1)
    .max(64)
    .required()
    .messages({
      'string.empty': 'key مطلوب لكل خيار',
      'any.required': 'key مطلوب لكل خيار'
    }),

  value: Joi.string()
    .trim()
    .min(1)
    .max(255)
    .required()
    .messages({
      'string.empty': 'value مطلوب لكل خيار',
      'any.required': 'value مطلوب لكل خيار'
    })
})

const checkListBodySchema = Joi.object({
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

  min_selected: Joi.number()
    .integer()
    .min(0)
    .required()
    .messages({
      'any.required': 'min_selected مطلوب',
      'number.min': 'min_selected يجب أن يكون 0 أو أكبر'
    }),

  max_selected: Joi.number()
    .integer()
    .min(1)
    .required()
    .messages({
      'any.required': 'max_selected مطلوب',
      'number.min': 'max_selected يجب أن يكون 1 أو أكبر'
    }),

  options: Joi.array()
    .items(optionSchema)
    .min(1)
    .required()
    .messages({
      'array.min': 'يجب إضافة خيار واحد على الأقل',
      'any.required': 'options مطلوب'
    })
}).messages({
  'object.unknown': 'الحقل {#label} غير مسموح به'
})

function validateUniqueOptionKeys (options = []) {
  const keys = options.map(option => option.key)
  const uniqueKeys = new Set(keys)

  if (uniqueKeys.size !== keys.length) {
    return 'مفاتيح الخيارات (key) يجب أن تكون فريدة'
  }

  return null
}

function validateSelectionRange (minSelected, maxSelected, optionsCount) {
  if (minSelected > maxSelected) {
    return 'min_selected يجب أن يكون أقل من أو يساوي max_selected'
  }

  if (maxSelected > optionsCount) {
    return 'max_selected لا يمكن أن يتجاوز عدد الخيارات'
  }

  return null
}

function validateCreateCheckList (data) {
  const { error, value } = checkListBodySchema.validate(data, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true
  })

  if (error) {
    return { error, value: null }
  }

  const uniqueKeysError = validateUniqueOptionKeys(value.options)

  if (uniqueKeysError) {
    return {
      error: {
        details: [{ message: uniqueKeysError }]
      },
      value: null
    }
  }

  const rangeError = validateSelectionRange(
    value.min_selected,
    value.max_selected,
    value.options.length
  )

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
      min_selected: Number(value.min_selected),
      max_selected: Number(value.max_selected)
    }
  }
}

module.exports = {
  validateCreateCheckList
}
