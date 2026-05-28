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

      // ================================================
      // TRANSACTION
      // ================================================

      {
        model: db.Transaction,
        as: 'transaction'
      },

      // ================================================
      // CURRENT STAGE
      // ================================================

      {
        model: db.Stage,
        as: 'current_stage',

        include: [

          // ============================================
          // STAGE CONFIG
          // ============================================

          {
            model: db.StageConfig,
            as: 'stage_config'
          }
        ]
      }
    ]
  })
}

module.exports = {

  findProcessInstanceByCamundaId
}