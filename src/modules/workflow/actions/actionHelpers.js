'use strict'

const Joi = require('joi')

const sendNotificationPayloadSchema = Joi.object({
  title: Joi.string().trim().min(1).max(255).required().messages({
    'any.required': 'SEND_NOTIFICATION payload.title مطلوب',
    'string.empty': 'SEND_NOTIFICATION payload.title مطلوب ولا يجوز أن يكون فارغاً',
    'string.base': 'SEND_NOTIFICATION payload.title مطلوب ويجب أن يكون نصاً'
  }),
  message: Joi.string().trim().min(1).max(2000).required().messages({
    'any.required': 'SEND_NOTIFICATION payload.message مطلوب',
    'string.empty': 'SEND_NOTIFICATION payload.message مطلوب ولا يجوز أن يكون فارغاً',
    'string.base': 'SEND_NOTIFICATION payload.message مطلوب ويجب أن يكون نصاً'
  }),
  subject: Joi.string().trim().max(255).allow('', null).optional(),
  type: Joi.string().trim().min(1).max(100).default('workflow_notification').messages({
    'string.empty': 'SEND_NOTIFICATION payload.type لا يجوز أن يكون فارغاً',
    'string.base': 'SEND_NOTIFICATION payload.type يجب أن يكون نصاً'
  }),
  // المُستلِم عبر الدور: organization_id + department_id + role_id (الثلاثة معاً)
  organization_id: Joi.number().integer().positive().allow(null).optional().messages({
    'number.base': 'SEND_NOTIFICATION payload.organization_id يجب أن يكون رقماً',
    'number.positive': 'SEND_NOTIFICATION payload.organization_id يجب أن يكون رقماً موجباً'
  }),
  department_id: Joi.number().integer().positive().allow(null).optional().messages({
    'number.base': 'SEND_NOTIFICATION payload.department_id يجب أن يكون رقماً',
    'number.positive': 'SEND_NOTIFICATION payload.department_id يجب أن يكون رقماً موجباً'
  }),
  role_id: Joi.number().integer().positive().allow(null).optional().messages({
    'number.base': 'SEND_NOTIFICATION payload.role_id يجب أن يكون رقماً',
    'number.positive': 'SEND_NOTIFICATION payload.role_id يجب أن يكون رقماً موجباً'
  }),
  // يُحسب لاحقاً من (organization_id, department_id, role_id) في الخدمة
  to_organization_department_roles_id: Joi.number().integer().positive().allow(null).optional().messages({
    'number.base': 'SEND_NOTIFICATION payload.to_organization_department_roles_id يجب أن يكون رقماً',
    'number.positive': 'SEND_NOTIFICATION payload.to_organization_department_roles_id يجب أن يكون رقماً موجباً'
  }),
  to_camunda_group_key: Joi.string().trim().max(64).allow(null).optional(),
  to_organization_department_roles_camunda_group_key: Joi.string().trim().max(64).allow(null).optional().messages({
    'string.base': 'SEND_NOTIFICATION payload.to_camunda_group_key يجب أن يكون نصاً'
  })
})
  // لازم يكون فيه مُستلِم: إما (organization_id, department_id, role_id) معاً أو to_camunda_group_key (مثل AUTH).
  // نستخدم custom لأن .or() في Joi يعتبر القيمة null كأنها موجودة، بينما normalizeActionPayload
  // يملأ الحقول الفارغة بـ null.
  .custom((value, helpers) => {
    const hasRoleParts =
      value.organization_id != null ||
      value.department_id != null ||
      value.role_id != null

    const hasGroupKey =
      (typeof value.to_camunda_group_key === 'string' && value.to_camunda_group_key.trim() !== '') ||
      (typeof value.to_organization_department_roles_camunda_group_key === 'string' &&
        value.to_organization_department_roles_camunda_group_key.trim() !== '')

    const hasResolvedRoleId = value.to_organization_department_roles_id != null

    // إذا بدأ بتحديد المُستلِم بالدور، لازم الثلاثة معاً
    if (hasRoleParts) {
      if (
        value.organization_id == null ||
        value.department_id == null ||
        value.role_id == null
      ) {
        return helpers.error('any.custom.incompleteRole')
      }

      return value
    }

    if (!hasGroupKey && !hasResolvedRoleId) {
      return helpers.error('any.custom.noTarget')
    }

    return value
  })
  .messages({
    'any.custom.noTarget':
      'SEND_NOTIFICATION payload يحتاج إما (organization_id, department_id, role_id) أو to_camunda_group_key (مثل "AUTH")',
    'any.custom.incompleteRole':
      'SEND_NOTIFICATION: عند تحديد المُستلِم بالدور يجب إرسال organization_id و department_id و role_id معاً'
  })

const generatePdfPayloadSchema = Joi.object({
  // template_id = document_templates.id — نفس id في templates[].id من USER_TASK
  template_id: Joi.number().integer().positive().required().messages({
    'any.required': 'GENERATE_PDF payload.template_id مطلوب',
    'number.base': 'GENERATE_PDF payload.template_id يجب أن يكون رقماً',
    'number.positive': 'GENERATE_PDF payload.template_id يجب أن يكون رقماً موجباً'
  })
}).unknown(false).messages({
  'object.unknown': 'GENERATE_PDF payload يقبل فقط template_id — الحقل {#label} غير مسموح'
})

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
    organization_id: action.organization_id ?? payload.organization_id ?? null,
    department_id: action.department_id ?? payload.department_id ?? null,
    role_id: action.role_id ?? payload.role_id ?? null,
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
    stripUnknown: false
  })

  return error || null
}

const ALLOWED_ACTION_NAMES = ['SEND_NOTIFICATION', 'GENERATE_PDF']

function validateStageAction (action = {}, stageId = null) {
  if (!action?.name) {
    return `المرحلة ${stageId}: كل action في config_json يحتاج name`
  }

  if (!ALLOWED_ACTION_NAMES.includes(action.name)) {
    return `المرحلة ${stageId}: نوع الـ action "${action.name}" غير مدعوم — المسموح فقط: ${ALLOWED_ACTION_NAMES.join(' أو ')}`
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
