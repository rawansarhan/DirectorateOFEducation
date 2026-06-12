'use strict'

const Joi = require('joi')

const sendNotificationPayloadSchema = Joi.object({
  message: Joi.string().trim().min(1).max(2000).required(),
  title: Joi.string().trim().max(255).allow('', null).optional(),
  subject: Joi.string().trim().max(255).allow('', null).optional(),
  type: Joi.string().trim().max(100).default('workflow_notification'),
  to: Joi.number().integer().positive().optional(),
  to_organization_department_roles_id: Joi.number().integer().positive().optional(),
  to_camunda_group_key: Joi.string().trim().max(64).optional(),
  to_organization_department_roles_camunda_group_key: Joi.string().trim().max(64).optional()
})
  .or(
    'to',
    'to_organization_department_roles_id',
    'to_camunda_group_key',
    'to_organization_department_roles_camunda_group_key'
  )
  .messages({
    'object.missing':
      'SEND_NOTIFICATION payload يحتاج to (organization_department_roles_id) أو to_camunda_group_key (مثل AUTH)'
  })

const generatePdfPayloadSchema = Joi.object({
  // template_id = document_templates.id — نفس id في templates[].id من USER_TASK
  template_id: Joi.number().integer().positive().required().messages({
    'any.required': 'GENERATE_PDF payload.template_id مطلوب',
    'number.base': 'GENERATE_PDF payload.template_id يجب أن يكون رقماً',
    'number.positive': 'GENERATE_PDF payload.template_id يجب أن يكون موجباً'
  })
}).unknown(false)

function normalizeActionPayload (action = {}) {
  const payload = action.payload || {}

  const roleId =
    action.to ??
    action.to_organization_department_roles_id ??
    payload.to ??
    payload.to_organization_department_roles_id ??
    null

  const camundaGroupKey =
    action.to_camunda_group_key ??
    action.to_organization_department_roles_camunda_group_key ??
    payload.to_camunda_group_key ??
    payload.to_organization_department_roles_camunda_group_key ??
    null

  return {
    ...payload,
    to_organization_department_roles_id: roleId,
    to_organization_department_roles_camunda_group_key: camundaGroupKey,
    title: action.title ?? payload.title ?? null,
    subject: action.subject ?? payload.subject ?? null,
    message: action.message ?? payload.message ?? null,
    type: action.type ?? payload.type ?? 'workflow_notification'
  }
}

function resolveActionsFromConfigJson (configJson = {}) {
  if (Array.isArray(configJson.actions) && configJson.actions.length) {
    return configJson.actions
  }

  return []
}

/**
 * SERVICE_TASK: actions from stage_configs.config_json (auto on complete flow)
 * USER_TASK: no auto actions from config (optional body.actions on complete)
 */
function resolveActionsForStage (stage, stageConfig = {}) {
  const configJson = stageConfig.config_json || stageConfig.config || {}

  if (stage?.type === 'SERVICE_TASK') {
    return resolveActionsFromConfigJson(configJson)
  }

  return []
}

function validateSendNotificationPayload (payload = {}) {
  const { error } = sendNotificationPayloadSchema.validate(payload, {
    abortEarly: false,
    stripUnknown: false
  })

  return error || null
}

function validateGeneratePdfPayload (payload = {}) {
  const { error } = generatePdfPayloadSchema.validate(payload, {
    abortEarly: false,
    stripUnknown: true
  })

  return error || null
}

function validateStageAction (action = {}, stageId = null) {
  if (!action?.name) {
    return `المرحلة ${stageId}: كل action في config_json يحتاج name`
  }

  if (action.name === 'SEND_NOTIFICATION') {
    const payload = normalizeActionPayload(action)
    const validationError = validateSendNotificationPayload(payload)

    if (validationError) {
      const details = validationError.details.map(item => item.message).join(' | ')
      return `المرحلة ${stageId}: SEND_NOTIFICATION — ${details}`
    }
  }

  if (action.name === 'GENERATE_PDF') {
    // يُعرّف في stage_config: { name: "GENERATE_PDF", payload: { template_id: 1 } }
    const validationError = validateGeneratePdfPayload(action.payload || {})

    if (validationError) {
      const details = validationError.details.map(item => item.message).join(' | ')
      return `المرحلة ${stageId}: GENERATE_PDF — ${details}`
    }
  }

  return null
}

/** @deprecated use resolveActionsForStage */
function resolveActionsFromStageConfig (configJson = {}) {
  return resolveActionsFromConfigJson(configJson)
}

module.exports = {
  normalizeActionPayload,
  resolveActionsFromConfigJson,
  resolveActionsForStage,
  resolveActionsFromStageConfig,
  validateSendNotificationPayload,
  validateGeneratePdfPayload,
  validateStageAction,
  sendNotificationPayloadSchema
}
