function normalizeActionPayload (action = {}) {
  const payload = action.payload || {}

  return {
    ...payload,
    to_organization_department_roles_id:
      action.to_organization_department_roles_id ??
      payload.to_organization_department_roles_id,
    to_organization_department_roles_camunda_group_key:
      action.to_organization_department_roles_camunda_group_key ??
      payload.to_organization_department_roles_camunda_group_key,
    subject: action.subject ?? payload.subject,
    message: action.message ?? payload.message
  }
}

function resolveActionsFromConfigJson (configJson = {}) {
  if (Array.isArray(configJson.actions) && configJson.actions.length) {
    return configJson.actions
  }

  return []
}

/**
 * SERVICE_TASK: actions من config_json
 * USER_TASK: لا actions تلقائية من الإعداد (فقط body عند complete)
 */
function resolveActionsForStage (stage, stageConfig = {}) {
  const configJson = stageConfig.config_json || stageConfig.config || {}

  if (stage?.type === 'SERVICE_TASK') {
    return resolveActionsFromConfigJson(configJson)
  }

  return []
}

/** @deprecated استخدم resolveActionsForStage */
function resolveActionsFromStageConfig (configJson = {}) {
  return resolveActionsFromConfigJson(configJson)
}

module.exports = {
  normalizeActionPayload,
  resolveActionsFromConfigJson,
  resolveActionsForStage,
  resolveActionsFromStageConfig
}
