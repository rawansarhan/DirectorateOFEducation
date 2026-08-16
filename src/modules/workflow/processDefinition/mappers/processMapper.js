function toAuthProcessResponse(process) {

  const authStage = process.stages[0]

  return {

    process_id: process.id,

    name: process.name,

    code: process.code,

    priority: process.priority,

    auth_stage: {

      id: authStage.id,

      name: authStage.name,

      code: authStage.code,

      type: authStage.type,

      auth_type: authStage.auth_type
    }
  }
}

function toUnapprovedOrInactiveProcessItem (process) {
  return {
    id: process.id,
    name: process.name,
    status: process.approval_status,
    is_approved: process.approval_status === 'APPROVED',
    is_active: Boolean(process.is_active)
  }
}

function toProcessMissingStageConfigItem (process) {
  return {
    id: process.id,
    name: process.name,
    status: process.approval_status,
    is_approved: process.approval_status === 'APPROVED',
    is_active: Boolean(process.is_active),
    stages_total_count: Number(process.stages_total_count || 0),
    stages_missing_config_count: Number(process.stages_missing_config_count || 0)
  }
}

function toAdminProcessByTypeItem (process) {
  return {
    process_id: process.id,
    name: process.name,
    code: process.code,
    priority: process.priority,
    deployment_status: process.status,
    approval_status: process.approval_status,
    is_active: Boolean(process.is_active)
  }
}

//============================================================================================
//=================================== PROCESS DETAILS MAPPER =================================

function toPlainModel (model) {
  if (!model) {
    return null
  }

  return typeof model.get === 'function'
    ? model.get({ plain: true })
    : model
}

function mapStageAssignment (assignment) {
  const odr = toPlainModel(assignment.organization_department_role)

  const mapped = {
    organization_department_roles_id:
      assignment.organization_department_roles_id
  }

  if (!odr) {
    return mapped
  }

  // نفس شكل الإدخال في POST /stage_config/create
  mapped.organization_id = odr.organization_id ?? null
  mapped.department_id = odr.department_id ?? null
  mapped.role_id = odr.role_id ?? odr.role?.id ?? null

  mapped.role = {
    id: mapped.role_id,
    name: odr.role?.name ?? null,
    is_active: odr.is_active,
    organization: odr.organization
      ? {
          id: odr.organization.id ?? odr.organization_id ?? null,
          name: odr.organization.name ?? null
        }
      : null,
    department: odr.department
      ? {
          id: odr.department.id ?? odr.department_id ?? null,
          name: odr.department.name ?? null
        }
      : null
  }

  return mapped
}

function processDetailsMapper(process) {
  const approvalStatus = process.approval_status

  return {

    process: {

      id: process.id,
      name: process.name,
      code: process.code,
      status: process.status,
      version: process.version,
      is_active: process.is_active,
      approval_status: approvalStatus,
      is_approved: approvalStatus === 'APPROVED',
      start_date: process.start_date,
      end_date: process.end_date
    },

    stages: (process.stages || []).map(stage => ({
      id: stage.id,
      name: stage.name,
      code: stage.code,
      type: stage.type,
      auth_type: stage.auth_type,
      has_config: Boolean(stage.stage_config),
      config: stage.stage_config?.config_json ?? null,
      has_assignments: Boolean(stage.stage_assignments?.length),
      assignments: (stage.stage_assignments || []).map(mapStageAssignment)
    }))
  }
}


module.exports = {
  toAuthProcessResponse,
  toUnapprovedOrInactiveProcessItem,
  toProcessMissingStageConfigItem,
  toAdminProcessByTypeItem,
  processDetailsMapper
}