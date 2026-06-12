const db =
  require('../../../../entities')

// ======================================================
// GET PROCESS INSTANCE
// ======================================================

async function findProcessInstanceByCamundaId(
  camundaProcessInstanceId
) {

  return db.ProcessInstance.findOne({

    where: {

      camunda_process_instance_id:
        camundaProcessInstanceId
    },

    include: [

      {
        model: db.ProcessDefinition,
        as: 'process_definition',
        attributes: ['id', 'name', 'priority', 'code']
      },

      {
        model: db.Transaction,
        as: 'transaction',
        include: [
          {
            model: db.User,
            as: 'user',
            attributes: [
              'id',
              'phone_number',
              'first_name',
              'father_name',
              'last_name'
            ]
          }
        ]
      },

      {
        model: db.Stage,
        as: 'current_stage',

        include: [

          {
            model: db.StageConfig,
            as: 'stage_config',
            attributes: ['id', 'stage_id', 'config_json']
          }
        ]
      }
    ]
  })
}

module.exports = {

  findProcessInstanceByCamundaId
}