'use strict'

const Joi = require('joi')
const { pickTypeDocIdFromObject } = require('../../../../core/utils/typeDocId')
const {
  resolveDateBound,
  compareDateOnly
} = require('../../../../core/utils/dateBound')

const WIDGET_TYPES = [
  'text_field',
  'date_picker',
  'dropdown',
  'radio_group',
  'check_list',
  'file_picker',
  'employee_picker'
]

const TEXT_FIELD_INPUT_TYPES = [
  'text',
  'string',
  'int',
  'phone',
  'phoneNumber',
  'email'
]

const STAGE_ACTION_NAMES = [
  'SEND_EMAIL',
  'SEND_NOTIFICATION',
  'GENERATE_PDF',
  'SYNC_SELF_CARD'
]

const widgetOptionSchema = Joi.object({
  key: Joi.string().trim().min(1).max(64).required(),
  value: Joi.string().trim().min(1).max(255).required()
})

const dateOnlySchema = Joi.string()
  .trim()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .messages({
    'string.pattern.base': 'التاريخ يجب أن يكون بصيغة YYYY-MM-DD'
  })

/** مطلق YYYY-MM-DD | today | relative من اليوم (سنوات/أشهر/أيام) */
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

const widgetIdSchema = Joi.string().trim().min(1).max(128).required()
const widgetLabelSchema = Joi.string().trim().min(1).max(255).required()

const textFieldDataSchema = Joi.object({
  id: widgetIdSchema,
  label: widgetLabelSchema,
  is_required: Joi.boolean().default(false),
  input_type: Joi.string()
    .valid(...TEXT_FIELD_INPUT_TYPES)
    .required(),
  regex: Joi.string().trim().max(500).allow(null, '').optional(),
  max_length: Joi.number().integer().min(1).allow(null).optional(),
  min_length: Joi.number().integer().min(0).allow(null).optional()
}).unknown(false)

const datePickerDataSchema = Joi.object({
  id: widgetIdSchema,
  label: widgetLabelSchema,
  is_required: Joi.boolean().default(false),
  min_date: dateBoundSchema.required(),
  max_date: dateBoundSchema.required()
}).unknown(false)

const dropdownDataSchema = Joi.object({
  id: widgetIdSchema,
  label: widgetLabelSchema,
  is_required: Joi.boolean().default(false),
  options: Joi.array().items(widgetOptionSchema).min(1).required()
}).unknown(false)

const radioGroupDataSchema = dropdownDataSchema.keys({
  is_gateway: Joi.boolean().default(false)
})

const checkListDataSchema = Joi.object({
  id: widgetIdSchema,
  label: widgetLabelSchema,
  is_required: Joi.boolean().default(false),
  min_selected: Joi.number().integer().min(0).required(),
  max_selected: Joi.number().integer().min(1).required(),
  options: Joi.array().items(widgetOptionSchema).min(1).required()
}).unknown(false)

const filePickerDataSchema = Joi.object({
  id: widgetIdSchema,
  label: widgetLabelSchema,
  is_required: Joi.boolean().default(false),
  max_size_mb: Joi.number().integer().min(1).max(100).required(),
  allowed_extensions: Joi.array()
    .items(
      Joi.string()
        .trim()
        .lowercase()
        .pattern(/^[a-z0-9]{1,10}$/)
    )
    .min(1)
    .required(),
  allow_multiple: Joi.boolean().default(false),
  type_doc_id: Joi.number().integer().positive().required().messages({
    'any.required': 'type_doc_id مطلوب في file_picker',
    'number.base': 'type_doc_id في file_picker يجب أن يكون رقماً صحيحاً',
    'number.positive': 'type_doc_id في file_picker يجب أن يكون رقماً موجباً'
  }),
  type_Doc_id: Joi.any().strip(),
  TypeDoc_id: Joi.any().strip()
}).unknown(false)

/**
 * اختيار بطاقة ذاتية — الخيارات من:
 * GET /api/self-cards/search
 * القيمة عند الإرسال:
 *   {
 *     self_card_id: number,     // إلزامي = employee_self_cards.id
 *     path_self_card?: string   // اختياري — مسار CV بلاحقة .pdf
 *   }
 */
const employeePickerDataSchema = Joi.object({
  id: widgetIdSchema,
  label: widgetLabelSchema,
  is_required: Joi.boolean().default(true),
  options_source: Joi.string()
    .valid('self_cards_search', 'employees_search')
    .default('self_cards_search')
}).unknown(false)

const widgetSchema = Joi.object({
  widget_type: Joi.string().valid(...WIDGET_TYPES).required(),
  data: Joi.alternatives().conditional('widget_type', {
    switch: [
      { is: 'text_field', then: textFieldDataSchema },
      { is: 'date_picker', then: datePickerDataSchema },
      { is: 'dropdown', then: dropdownDataSchema },
      { is: 'radio_group', then: radioGroupDataSchema },
      { is: 'check_list', then: checkListDataSchema },
      { is: 'file_picker', then: filePickerDataSchema },
      { is: 'employee_picker', then: employeePickerDataSchema }
    ],
    otherwise: Joi.forbidden()
  })
}).unknown(false)

const templateItemSchema = Joi.object({
  template_id: Joi.number().integer().positive().required()
}).unknown(false)

const stageActionSchema = Joi.object({
  name: Joi.string().valid(...STAGE_ACTION_NAMES).required(),
  payload: Joi.when('name', {
    switch: [
      {
        is: 'SEND_NOTIFICATION',
        then: Joi.object({
          message: Joi.string().trim().min(1).max(2000).required(),
          title: Joi.string().trim().max(255).allow('', null).optional(),
          subject: Joi.string().trim().max(255).allow('', null).optional(),
          type: Joi.string().trim().max(100).default('workflow_notification'),
          organization_id: Joi.number().integer().positive().optional(),
          department_id: Joi.number().integer().positive().optional(),
          role_id: Joi.number().integer().positive().optional(),
          to: Joi.number().integer().positive().optional(),
          to_organization_department_roles_id: Joi.number().integer().positive().optional(),
          to_camunda_group_key: Joi.string().trim().max(64).optional(),
          to_organization_department_roles_camunda_group_key: Joi.string().trim().max(64).optional()
        })
          .or(
            'to',
            'role_id',
            'to_organization_department_roles_id',
            'to_camunda_group_key',
            'to_organization_department_roles_camunda_group_key'
          )
          .and('organization_id', 'department_id', 'role_id')
      },
      {
        is: 'GENERATE_PDF',
        then: Joi.object({
          template_id: Joi.number().integer().positive().required()
        }).unknown(false)
      },
      {
        is: 'SYNC_SELF_CARD',
        then: Joi.object({
          target: Joi.string()
            .valid(
              'profile_header',
              'update_profile_header',
              'training_course',
              'employment_status',
              'irregular_absence',
              'leave',
              'reward',
              'sanction'
            )
            .required(),
          employee_user_id_from: Joi.string().valid('WIDGET').default('WIDGET'),
          self_card_id_widget: Joi.string().trim().max(128).default('self_card_id'),
          employee_user_id_widget: Joi.string().trim().max(128).optional(),
          source_stage: Joi.string().trim().max(128).default('PREVIOUS_USER_TASK'),
          field_map: Joi.object()
            .pattern(
              Joi.string().trim().min(1).max(64),
              Joi.string().trim().min(1).max(128)
            )
            .min(1)
            .required()
        }).unknown(false)
      }
    ],
    otherwise: Joi.object().default({})
  }).default({})
}).unknown(true)

const ORG_DEP_ROLE_ASSIGNMENT_WIDGET_ID = 'OrgDepRole'

/** dropdown في config_json لاختيار الوجهة التالية (key = camunda_group_key) */
const orgDepRoleAssignmentsSchema = Joi.object({
  widget_type: Joi.string().valid('dropdown').required().messages({
    'any.only': 'config_json.assignments.widget_type يجب أن يكون dropdown'
  }),
  data: Joi.object({
    id: Joi.string()
      .valid(ORG_DEP_ROLE_ASSIGNMENT_WIDGET_ID)
      .required()
      .messages({
        'any.only': `config_json.assignments.data.id يجب أن يكون ${ORG_DEP_ROLE_ASSIGNMENT_WIDGET_ID}`
      }),
    label: widgetLabelSchema,
    is_required: Joi.boolean().default(true),
    options: Joi.array().items(widgetOptionSchema).min(1).required()
  })
    .unknown(false)
    .required()
}).unknown(false)

const stageConfigJsonSchema = Joi.object({
  form_id: Joi.string().trim().min(1).max(128).required(),
  form_name: Joi.string().trim().min(1).max(255).required(),
  widgets: Joi.array().items(widgetSchema).default([]),
  template: Joi.array().items(templateItemSchema).default([]),
  actions: Joi.array().items(stageActionSchema).optional(),
  is_assignment: Joi.boolean().default(false).optional(),
  /** @deprecated — استخدم is_assignment بدلاً من assignments widget */
  assignments: orgDepRoleAssignmentsSchema.optional(),
  requires_digital_signature: Joi.boolean().optional().default(true)
}).unknown(false)

function assertValidRegex (regex) {
  if (regex === null || regex === undefined || regex === '') {
    return null
  }

  try {
    // eslint-disable-next-line no-new
    new RegExp(regex)
    return String(regex)
  } catch (error) {
    return null
  }
}

function validateUniqueOptionKeys (options = []) {
  const keys = options.map(option => option.key)
  return new Set(keys).size === keys.length
}

function validateWidgetsBusinessRules (widgets = []) {
  const seenIds = new Set()

  for (const widget of widgets) {
    const data = widget.data || {}
    const widgetId = data.id

    if (seenIds.has(widgetId)) {
      return `معرّف الودجت "${widgetId}" مكرر داخل widgets`
    }

    seenIds.add(widgetId)

    if (widget.widget_type === 'text_field') {
      if (data.regex && !assertValidRegex(data.regex)) {
        return `regex غير صالح للودجت "${widgetId}"`
      }

      if (
        data.min_length != null &&
        data.max_length != null &&
        Number(data.min_length) > Number(data.max_length)
      ) {
        return `min_length يجب أن يكون أقل من أو يساوي max_length للودجت "${widgetId}"`
      }
    }

    if (widget.widget_type === 'date_picker') {
      try {
        const min = resolveDateBound(data.min_date)
        const max = resolveDateBound(data.max_date)

        if (compareDateOnly(min, max) > 0) {
          return `min_date يجب أن يكون قبل أو يساوي max_date للودجت "${widgetId}"`
        }
      } catch (_) {
        return `حدود التاريخ غير صالحة للودجت "${widgetId}"`
      }
    }

    if (
      widget.widget_type === 'dropdown' ||
      widget.widget_type === 'radio_group' ||
      widget.widget_type === 'check_list'
    ) {
      if (!validateUniqueOptionKeys(data.options)) {
        return `مفاتيح الخيارات (key) يجب أن تكون فريدة للودجت "${widgetId}"`
      }
    }

    if (widget.widget_type === 'check_list') {
      if (data.min_selected > data.max_selected) {
        return `min_selected يجب أن يكون أقل من أو يساوي max_selected للودجت "${widgetId}"`
      }

      if (data.max_selected > data.options.length) {
        return `max_selected لا يمكن أن يتجاوز عدد الخيارات للودجت "${widgetId}"`
      }
    }
  }

  return null
}

function normalizeFilePickerWidgetData (widgets = []) {
  return widgets.map(widget => {
    if (widget?.widget_type !== 'file_picker' || !widget.data) {
      return widget
    }

    const typeDocId = pickTypeDocIdFromObject(widget.data)

    return {
      ...widget,
      data: {
        ...widget.data,
        type_doc_id: typeDocId,
        type_Doc_id: undefined,
        TypeDoc_id: undefined
      }
    }
  })
}

function validateStageConfigJson (value) {
  const normalizedInput = {
    ...value,
    widgets: normalizeFilePickerWidgetData(value?.widgets || [])
  }

  const { error, value: validated } = stageConfigJsonSchema.validate(normalizedInput, {
    abortEarly: false,
    stripUnknown: true
  })

  if (error) {
    return { error, value: null }
  }

  const widgetsError = validateWidgetsBusinessRules(validated.widgets)

  if (widgetsError) {
    return {
      error: {
        details: [{ message: widgetsError }]
      },
      value: null
    }
  }

  if (validated.assignments?.data?.options) {
    if (!validateUniqueOptionKeys(validated.assignments.data.options)) {
      return {
        error: {
          details: [{
            message:
              'مفاتيح الخيارات (key) يجب أن تكون فريدة في config_json.assignments'
          }]
        },
        value: null
      }
    }
  }

  return { error: null, value: validated }
}

const documentPdfSettingsSchema = Joi.object({
  flatten: Joi.boolean().default(true),
  auto_font_size: Joi.boolean().default(true),
  fill_mode: Joi.string().valid('BURN_IN', 'ACROFORM').default('BURN_IN'),
  font_size: Joi.number().min(4).max(72).optional(),
  min_font_size: Joi.number().min(4).max(72).default(10),
  max_font_size: Joi.number().min(4).max(72).default(14),
  line_height: Joi.number().min(8).max(72).default(14),
  filter_by_widgets: Joi.boolean().default(false)
}).unknown(false)

const documentFormConfigJsonSchema = Joi.object({
  form_id: Joi.string().trim().min(1).max(128).required(),
  form_name: Joi.string().trim().min(1).max(255).required(),
  widgets: Joi.array().items(widgetSchema).default([]),
  pdf: documentPdfSettingsSchema.optional()
}).unknown(false)

const DOCUMENT_TEMPLATE_WIDGET_TYPES = [
  'text_field',
  'date_picker',
  'dropdown',
  'check_list'
]

const documentTemplateWidgetSchema = Joi.object({
  widget_type: Joi.string()
    .valid(...DOCUMENT_TEMPLATE_WIDGET_TYPES)
    .required()
    .messages({
      'any.only':
        'widget_type غير مسموح — المسموح فقط: text_field, date_picker, dropdown, check_list'
    }),
  data: Joi.alternatives().conditional('widget_type', {
    switch: [
      { is: 'text_field', then: textFieldDataSchema },
      { is: 'date_picker', then: datePickerDataSchema },
      { is: 'dropdown', then: dropdownDataSchema },
      { is: 'check_list', then: checkListDataSchema }
    ],
    otherwise: Joi.forbidden()
  })
}).unknown(false)

const documentTemplateFormConfigJsonSchema = Joi.object({
  form_id: Joi.string().trim().min(1).max(128).required(),
  form_name: Joi.string().trim().min(1).max(255).required(),
  widgets: Joi.array().items(documentTemplateWidgetSchema).default([]),
  pdf: documentPdfSettingsSchema.optional()
}).unknown(false)

function validateDocumentFormConfigJson (value) {
  const { error, value: validated } = documentFormConfigJsonSchema.validate(value, {
    abortEarly: false,
    stripUnknown: true
  })

  if (error) {
    return { error, value: null }
  }

  const widgetsError = validateWidgetsBusinessRules(validated.widgets)

  if (widgetsError) {
    return {
      error: {
        details: [{ message: widgetsError }]
      },
      value: null
    }
  }

  return { error: null, value: validated }
}

function validateDocumentTemplateConfigJson (value) {
  const { error, value: validated } = documentTemplateFormConfigJsonSchema.validate(value, {
    abortEarly: false,
    stripUnknown: true
  })

  if (error) {
    return { error, value: null }
  }

  const widgetsError = validateWidgetsBusinessRules(validated.widgets)

  if (widgetsError) {
    return {
      error: {
        details: [{ message: widgetsError }]
      },
      value: null
    }
  }

  return { error: null, value: validated }
}

module.exports = {
  WIDGET_TYPES,
  DOCUMENT_TEMPLATE_WIDGET_TYPES,
  TEXT_FIELD_INPUT_TYPES,
  STAGE_ACTION_NAMES,
  ORG_DEP_ROLE_ASSIGNMENT_WIDGET_ID,
  stageActionSchema,
  orgDepRoleAssignmentsSchema,
  stageConfigJsonSchema,
  documentFormConfigJsonSchema,
  documentTemplateFormConfigJsonSchema,
  widgetSchema,
  documentTemplateWidgetSchema,
  validateStageConfigJson,
  validateDocumentFormConfigJson,
  validateDocumentTemplateConfigJson,
  validateWidgetsBusinessRules
}
