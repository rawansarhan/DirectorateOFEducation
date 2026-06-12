'use strict'

const Joi = require('joi')
const {
  WIDGET_TYPES,
  validateWidgetsBusinessRules
} = require('../../../workflow/stageConfig/validations/stageConfigSchema')
const {
  buildStageFormSnapshot
} = require('../../../workflow/services/stageFormSnapshotBuilder')

const FILE_WIDGET_TYPES = new Set(['file_picker'])

const FIELD_WIDGET_TYPES = new Set([
  'text_field',
  'date_picker',
  'dropdown',
  'radio_group',
  'check_list'
])

const TEXT_INPUT_TYPES = new Set([
  'text',
  'string',
  'int',
  'phone',
  'phoneNumber',
  'email'
])

const draftWidgetSchema = Joi.object({
  widget_type: Joi.string()
    .valid(...WIDGET_TYPES)
    .required()
    .messages({
      'any.only': 'نوع الودجت غير مدعوم',
      'any.required': 'widget_type مطلوب'
    }),
  data: Joi.object({
    id: Joi.string().trim().min(1).max(128).required()
  })
    .unknown(true)
    .required()
    .messages({
      'any.required': 'data مطلوب لكل ودجت'
    }),
  value: Joi.any()
    .required()
    .messages({
      'any.required': 'حقل value مطلوب لكل ودجت في المسودة'
    })
}).unknown(false)

const draftFormSchema = Joi.object({
  form_id: Joi.string()
    .trim()
    .min(1)
    .max(128)
    .required()
    .messages({
      'any.required': 'form_id مطلوب',
      'string.empty': 'form_id مطلوب'
    }),
  form_name: Joi.string()
    .trim()
    .min(1)
    .max(255)
    .required()
    .messages({
      'any.required': 'form_name مطلوب',
      'string.empty': 'form_name مطلوب'
    }),
  widgets: Joi.array()
    .items(draftWidgetSchema)
    .min(1)
    .required()
    .messages({
      'array.min': 'يجب إرسال ودجت واحد على الأقل',
      'any.required': 'widgets مطلوب'
    })
}).unknown(false)

const upsertDraftBodySchema = Joi.object({
  data: draftFormSchema.required().messages({
    'any.required': 'حقل data مطلوب'
  })
}).unknown(false)

function isEmptyValue (value) {
  if (value === null || value === undefined || value === '') {
    return true
  }

  if (Array.isArray(value) && value.length === 0) {
    return true
  }

  return false
}

function getExtension (filePath) {
  const parts = String(filePath).split('.')
  return parts.length > 1 ? parts.pop().toLowerCase() : ''
}

function validateTextFieldValue (data, value, label) {
  if (isEmptyValue(value)) {
    return null
  }

  const inputType = data.input_type

  if (inputType === 'int') {
    if (!Number.isInteger(Number(value)) || String(value).includes('.')) {
      return `"${label}" يجب أن يكون رقماً صحيحاً`
    }
  } else {
    const text = String(value)

    if (data.min_length != null && text.length < data.min_length) {
      return `"${label}" يجب ألا يقل عن ${data.min_length} حرفاً`
    }

    if (data.max_length != null && text.length > data.max_length) {
      return `"${label}" يجب ألا يتجاوز ${data.max_length} حرفاً`
    }

    if (data.regex) {
      try {
        const pattern = new RegExp(data.regex)

        if (!pattern.test(text)) {
          return `"${label}" لا يطابق الصيغة المطلوبة`
        }
      } catch (error) {
        return `regex غير صالح للودجت "${data.id}"`
      }
    }

    if (inputType === 'email') {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

      if (!emailPattern.test(text)) {
        return `"${label}" يجب أن يكون بريداً إلكترونياً صالحاً`
      }
    }
  }

  return null
}

function validateDatePickerValue (data, value, label) {
  if (isEmptyValue(value)) {
    return null
  }

  const text = String(value)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return `"${label}" يجب أن يكون بصيغة YYYY-MM-DD`
  }

  const date = new Date(`${text}T00:00:00Z`)

  if (Number.isNaN(date.getTime())) {
    return `"${label}" يحتوي تاريخاً غير صالح`
  }

  const min = new Date(`${data.min_date}T00:00:00Z`)
  const max = new Date(`${data.max_date}T00:00:00Z`)

  if (date < min || date > max) {
    return `"${label}" يجب أن يكون بين ${data.min_date} و ${data.max_date}`
  }

  return null
}

function validateOptionValue (data, value, label) {
  if (isEmptyValue(value)) {
    return null
  }

  const keys = new Set((data.options || []).map(option => option.key))

  if (!keys.has(String(value))) {
    return `"${label}" يحتوي خياراً غير مسموح`
  }

  return null
}

function validateCheckListValue (data, value, label) {
  if (isEmptyValue(value)) {
    return null
  }

  if (!Array.isArray(value)) {
    return `"${label}" يجب أن يكون مصفوفة من المفاتيح`
  }

  const keys = new Set((data.options || []).map(option => option.key))

  for (const item of value) {
    if (!keys.has(String(item))) {
      return `"${label}" يحتوي خياراً غير مسموح: ${item}`
    }
  }

  if (value.length < data.min_selected) {
    return `"${label}" يتطلب اختيار ${data.min_selected} عنصر/عناصر على الأقل`
  }

  if (value.length > data.max_selected) {
    return `"${label}" يسمح باختيار ${data.max_selected} عنصر/عناصر كحد أقصى`
  }

  return null
}

function validateFilePickerValue (data, value, label) {
  if (isEmptyValue(value)) {
    return null
  }

  const paths = data.allow_multiple
    ? (Array.isArray(value) ? value : [value])
    : (Array.isArray(value) ? value.slice(0, 1) : [value])

  if (!data.allow_multiple && Array.isArray(value) && value.length > 1) {
    return `"${label}" لا يسمح برفع أكثر من ملف`
  }

  const allowed = new Set(
    (data.allowed_extensions || []).map(ext => String(ext).toLowerCase())
  )

  for (const filePath of paths) {
    if (typeof filePath !== 'string' || !filePath.trim()) {
      return `"${label}" يجب أن يحتوي مسارات ملفات نصية صالحة`
    }

    const extension = getExtension(filePath)

    if (!allowed.has(extension)) {
      return `"${label}" يسمح فقط بالامتدادات: ${[...allowed].join(', ')}`
    }
  }

  return null
}

function validateWidgetValue (widget, value) {
  const data = widget.data || {}
  const label = data.label || data.id

  switch (widget.widget_type) {
    case 'text_field':
      return validateTextFieldValue(data, value, label)
    case 'date_picker':
      return validateDatePickerValue(data, value, label)
    case 'dropdown':
    case 'radio_group':
      return validateOptionValue(data, value, label)
    case 'check_list':
      return validateCheckListValue(data, value, label)
    case 'file_picker':
      return validateFilePickerValue(data, value, label)
    default:
      return `نوع الودجت "${widget.widget_type}" غير مدعوم`
  }
}

function validateDraftFormAgainstConfig (formData, stageConfig = {}) {
  if (formData.form_id !== stageConfig.form_id) {
    return 'form_id لا يطابق استمارة العملية المعرفة'
  }

  if (formData.form_name !== stageConfig.form_name) {
    return 'form_name لا يطابق استمارة العملية المعرفة'
  }

  const configWidgets = stageConfig.widgets || []

  if (!configWidgets.length) {
    return 'لا توجد ودجات معرفة في استمارة العملية'
  }

  const widgetsError = validateWidgetsBusinessRules(configWidgets)

  if (widgetsError) {
    return widgetsError
  }

  const submittedById = new Map()

  for (const widget of formData.widgets) {
    const widgetId = widget?.data?.id

    if (!widgetId) {
      return 'كل ودجت يجب أن يحتوي data.id'
    }

    if (submittedById.has(widgetId)) {
      return `معرّف الودجت "${widgetId}" مكرر في الطلب`
    }

    submittedById.set(widgetId, widget)
  }

  if (submittedById.size !== configWidgets.length) {
    return 'عدد الودجات المرسلة لا يطابق استمارة العملية'
  }

  const valueById = new Map()

  for (const configWidget of configWidgets) {
    const widgetId = configWidget.data.id
    const submitted = submittedById.get(widgetId)

    if (!submitted) {
      return `الودجت "${widgetId}" مفقود من الطلب`
    }

    if (submitted.widget_type !== configWidget.widget_type) {
      return `نوع الودجت "${widgetId}" لا يطابق الإعداد المعرف للعملية`
    }

    const valueError = validateWidgetValue(configWidget, submitted.value)

    if (valueError) {
      return valueError
    }

    valueById.set(widgetId, submitted.value)
  }

  return buildStageFormSnapshot(stageConfig, { value_by_id: valueById })
}

function validateUpsertDraftBody (body = {}) {
  const { error, value } = upsertDraftBodySchema.validate(body, {
    abortEarly: false,
    stripUnknown: true
  })

  if (error) {
    return {
      error: error.details.map(d => d.message).join(' | '),
      value: null
    }
  }

  return { error: null, value }
}

function hasUpsertFormPayload (body) {
  return Boolean(
    body &&
    typeof body === 'object' &&
    body.data &&
    typeof body.data === 'object'
  )
}

module.exports = {
  draftFormSchema,
  upsertDraftBodySchema,
  validateUpsertDraftBody,
  validateDraftFormAgainstConfig,
  hasUpsertFormPayload,
  validateWidgetValue,
  FIELD_WIDGET_TYPES,
  FILE_WIDGET_TYPES
}
