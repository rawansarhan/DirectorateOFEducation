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

function resolveActionsFromStageConfig (configJson = {}) {
  if (Array.isArray(configJson.actions) && configJson.actions.length) {
    return configJson.actions
  }

  const actionName = configJson.action || configJson.name

  if (actionName !== 'SEND_EMAIL' && actionName !== 'SEND_NOTIFICATION') {
    return []
  }

  return [{
    name: actionName,
    to_organization_department_roles_id:
      configJson.to_organization_department_roles_id,
    to_organization_department_roles_camunda_group_key:
      configJson.to_organization_department_roles_camunda_group_key,
    subject: configJson.subject,
    message: configJson.message
  }]
}

module.exports = {
  normalizeActionPayload,
  resolveActionsFromStageConfig
}
