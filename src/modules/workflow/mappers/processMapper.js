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

//============================================================================================
//=================================== PROCESS DETAILS MAPPER =================================

function processDetailsMapper(process) {

  return {

    process: {

      id: process.id,
      name: process.name,
      code: process.code,
      status: process.status,
      version: process.version,
      is_active: process.is_active,
      is_approved: process.is_approved,
      start_date: process.start_date,
      end_date: process.end_date
    },

    stages: process.stages.map(stage => ({

      id: stage.id,
      name: stage.name,
      type: stage.type,
      auth_type: stage.auth_type,

      config:
        stage.stage_config?.config_json || null,

      assignments:
        stage.stage_assignments.map(a => ({

          organization_department_roles_id:
            a.organization_department_roles_id
        }))
    }))
  }
}


module.exports = {
  toAuthProcessResponse,
  processDetailsMapper
}