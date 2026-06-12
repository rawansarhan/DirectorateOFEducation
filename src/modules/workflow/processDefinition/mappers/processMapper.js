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

function mapStageAssignment (assignment) {
  const role = assignment.organization_department_role

  const mapped = {
    organization_department_roles_id:
      assignment.organization_department_roles_id
  }

  if (role) {
    mapped.role = {
      id: role.id,
      is_active: role.is_active,
      department: role.department?.name || role.department_name || null,
      organization: role.organization?.name || role.organization_name || null
    }
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
  toAdminProcessByTypeItem,
  processDetailsMapper
}