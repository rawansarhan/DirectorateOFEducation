'use strict'

const Joi = require('joi')
const { WIDGET_TYPES } = require('../stageConfig/validations/stageConfigSchema')
const {
  validateDraftFormAgainstConfig
} = require('../../transaction/transaction/validations/draftFormValidation')
const {
  extractFieldsFilesFromWidgets
} = require('./stageFormSnapshotBuilder')

const formWidgetWithValueSchema = Joi.object({
  widget_type: Joi.string()
    .valid(...WIDGET_TYPES)
    .required(),
  data: Joi.object({
    id: Joi.string().trim().min(1).max(128).required()
  })
    .unknown(true)
    .required(),
  value: Joi.any().required()
}).unknown(false)

const formTemplateWithValueSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
  value: Joi.object().default({})
}).unknown(false)

const STRICT_FORM_UNKNOWN_HINTS = {
  fields: 'fields[] لم يعد مدعوماً — أرسل widgets[] (config_json + value)',
  files: 'files[] لم يعد مدعوماً — استخدم file_picker داخل widgets[]',
  values: 'استخدم value بدلاً من values في templates[]',
  template_id: 'استخدم id بدلاً من template_id في templates[]',
  variables:
    'variables لم يعد مدعوماً — استخدم radio_group مع is_gateway داخل widgets[]',
  employee:
    'employee لم يعد مدعوماً — أرسل حقول الموظف كـ widgets[] في stage_config',
  actions: 'actions لا تُرسل في الطلب — تُنفَّذ تلقائياً من stage_config',
  data: 'لا ترسل data — أرسل form_id و form_name و widgets[] مباشرة',
  schema_version: 'schema_version غير مطلوب',
  stage_name: 'stage_name غير مطلوب في الطلب — استخدم form_name من stage_config'
}

function buildStrictFormPayloadSchema (options = {}) {
  const {
    requireSignature = false,
    requireDecision = false,
    includeTemplates = true,
    includeDecision = false,
    includeExpectedVersion = true
  } = options

  const shape = {
    form_id: Joi.string().trim().min(1).max(128).required().messages({
      'any.required': 'form_id مطلوب ويجب أن يطابق stage_config',
      'string.empty': 'form_id مطلوب'
    }),
    form_name: Joi.string().trim().min(1).max(255).required().messages({
      'any.required': 'form_name مطلوب ويجب أن يطابق stage_config',
      'string.empty': 'form_name مطلوب'
    }),
    widgets: Joi.array()
      .items(formWidgetWithValueSchema)
      .min(0)
      .required()
      .messages({
        'any.required': 'widgets[] مطلوب — أرسل [] أو config_json + value لكل widget',
        'array.base': 'widgets[] مطلوب'
      }),
    note: Joi.string().max(10000).allow('', null).default('')
  }

  if (includeTemplates) {
    shape.templates = Joi.array().items(formTemplateWithValueSchema).default([])
  }

  if (includeDecision) {
    shape.decision = requireDecision
      ? Joi.string().valid('approve', 'reject', 'rejected').required()
      : Joi.string().max(64).optional()
  }

  if (includeExpectedVersion) {
    shape.expected_version = Joi.number().integer().min(0).optional()
  }

  if (requireSignature) {
    shape.signature = Joi.object({
      challenge_id: Joi.string().uuid().required(),
      signature: Joi.string().min(16).required()
    }).required()
  } else if (options.allowSignature) {
    shape.signature = Joi.object({
      challenge_id: Joi.string().uuid(),
      signing_id: Joi.string().uuid(),
      signature: Joi.string().min(16).required()
    })
      .or('challenge_id', 'signing_id')
      .optional()
  }

  if (options.allowRejectionReason) {
    shape.rejection_reason = Joi.when('decision', {
      is: Joi.valid('reject', 'rejected'),
      then: Joi.string().trim().min(1).max(5000).required(),
      otherwise: Joi.string().max(5000).allow('', null).optional()
    })
  }

  return Joi.object(shape).unknown(false)
}

function formatStrictFormJoiError (error, endpointLabel = 'الطلب') {
  if (!error?.details?.length) {
    return 'بيانات النموذج غير صالحة'
  }

  return error.details
    .map(detail => {
      const unknownKey = detail.context?.key ?? detail.path?.[0]

      if (detail.type === 'object.unknown' && unknownKey) {
        const hint = STRICT_FORM_UNKNOWN_HINTS[unknownKey]

        if (hint) {
          return `الحقل "${unknownKey}" غير مسموح في ${endpointLabel} — ${hint}`
        }
      }

      return detail.message
    })
    .join(' | ')
}

function emptyWidgetValue (widget) {
  if (widget?.widget_type === 'file_picker') {
    return widget?.data?.allow_multiple === false ? '' : []
  }

  if (widget?.widget_type === 'check_list') {
    return []
  }

  return ''
}

function buildEmptyFormEnvelope (configJson = {}) {
  return {
    form_id: configJson.form_id ?? null,
    form_name: configJson.form_name ?? null,
    widgets: (configJson.widgets || []).map(widget => ({
      widget_type: widget.widget_type,
      data: widget.data,
      value: emptyWidgetValue(widget)
    })),
    templates: (configJson.template || configJson.templates || []).map(item => ({
      id: item.template_id ?? item.id,
      value: {}
    })),
    note: ''
  }
}

function normalizeTemplateItems (templates = []) {
  return (templates || []).map(item => ({
    template_id: item.id,
    values: item.value ?? {}
  }))
}

function findGatewayWidgetConfig (configJson = {}) {
  const widgets = configJson.widgets || []
  const explicit = widgets.find(
    widget =>
      widget.widget_type === 'radio_group' &&
      (widget.data?.is_gateway === true ||
        widget.data?.id === 'gateway' ||
        widget.data?.id === 'decision')
  )

  if (explicit) {
    return explicit
  }

  const radioGroups = widgets.filter(widget => widget.widget_type === 'radio_group')

  if (radioGroups.length === 1) {
    return radioGroups[0]
  }

  return null
}

function extractGatewayValue (configJson = {}, widgets = []) {
  const gatewayWidget = findGatewayWidgetConfig(configJson)

  if (!gatewayWidget?.data?.id) {
    return null
  }

  const submitted = widgets.find(
    widget => widget?.data?.id === gatewayWidget.data.id
  )

  return submitted?.value ?? null
}

function mapTemplatesForHistory (templates = []) {
  return (templates || []).map(item => ({
    id_template: item.id ?? item.template_id ?? null,
    id_document_instance: item.document_instance_id ?? null,
    generated_pdf_path: item.generated_pdf_path ?? null,
    value: item.values ?? item.value ?? {}
  }))
}

async function validateAndNormalizeUnifiedFormPayload (
  payload = {},
  configJson = {},
  options = {}
) {
  const { stageName = null } = options

  if (!Array.isArray(payload.widgets)) {
    throw new Error(
      'widgets[] مطلوب — أرسل stage_config.config_json مع value لكل widget_type'
    )
  }

  if (!payload.widgets.length && (configJson?.widgets || []).length) {
    throw new Error(
      'widgets[] فارغ — يجب إرسال value لكل widget المعرف في stage_config'
    )
  }

  const formData = {
    form_id: payload.form_id,
    form_name: payload.form_name,
    widgets: payload.widgets
  }

  const validationResult = validateDraftFormAgainstConfig(formData, configJson)

  if (typeof validationResult === 'string') {
    throw new Error(validationResult)
  }

  const extracted = extractFieldsFilesFromWidgets(payload.widgets)
  const templates = normalizeTemplateItems(payload.templates || [])
  const gatewayValue = extractGatewayValue(configJson, validationResult.widgets)

  return {
    form_id: validationResult.form_id,
    form_name: validationResult.form_name,
    widgets: validationResult.widgets,
    fields: extracted.fields,
    files: extracted.files,
    templates,
    gateway_value: gatewayValue,
    decision: payload.decision ?? null,
    note: payload.note ?? '',
    stage_name: stageName ?? null,
    signature: payload.signature ?? null,
    rejection_reason: payload.rejection_reason ?? null,
    expected_version: payload.expected_version ?? null
  }
}

function buildCamundaGatewayVariables ({
  isReject = false,
  gatewayValue = null,
  signingDecision = null
}) {
  if (isReject) {
    return {
      value: {
        value: 'reject'
      }
    }
  }

  const routingValue = gatewayValue ?? signingDecision ?? 'approve'

  return {
    value: {
      value: routingValue
    }
  }
}

module.exports = {
  formWidgetWithValueSchema,
  formTemplateWithValueSchema,
  buildStrictFormPayloadSchema,
  formatStrictFormJoiError,
  STRICT_FORM_UNKNOWN_HINTS,
  buildEmptyFormEnvelope,
  normalizeTemplateItems,
  findGatewayWidgetConfig,
  extractGatewayValue,
  mapTemplatesForHistory,
  validateAndNormalizeUnifiedFormPayload,
  buildCamundaGatewayVariables
}
