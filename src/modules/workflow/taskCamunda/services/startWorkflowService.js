const transactionClient =
  require('../../../../core/shared/clients/transaction/transactionClient')

const EVENTS =
  require('../../../../core/shared/events/types')

const processRepository =
  require('../../processDefinition/repositories/processRepository')

const camundaClient =
  require('../../../../core/shared/clients/camunda/camundaClient')

const processInstanceRepository =
  require('../repositories/processInstanceRepository')

const outboxRepository =
  require('../../../../core/shared/outbox/repositories/OutboxRepository')

const {
  completeTask
} = require('./completeTaskService')
const { toStartWorkflow } = require('../mappers/taskCamundaMapper')

// ======================================================
// START WORKFLOW
// ======================================================

async function startWorkflow({

  transactionId,
  processCode
}) {

  // ====================================================
  // LOAD TRANSACTION + PROCESS
  // ====================================================

  const [transaction, process] =
    await Promise.all([

      transactionClient.getTransactionById(
        transactionId
      ),

      processRepository.findByCode(
        processCode
      )
    ])

  // ====================================================
  // VALIDATIONS
  // ====================================================

  if (!transaction) {
    throw new Error('Transaction not found')
  }

  if (transaction.status !== 'submitted') {
    throw new Error(
      'Transaction must be submitted first'
    )
  }

  if (!process) {
    throw new Error('Process not found')
  }

  if (!process.is_active) {
    throw new Error('Process is inactive')
  }

  if (!process.camunda_process_key) {
    throw new Error(
      'Missing Camunda process key'
    )
  }

  // ====================================================
  // START CAMUNDA PROCESS
  // ====================================================

  const camundaProcess =
    await camundaClient.startProcess(
      process.camunda_process_key,
      transaction.id
    )

  // ====================================================
  // CREATE PROCESS INSTANCE
  // ====================================================

  const processInstance =
    await processInstanceRepository.create({

      process_definition_id:
        process.id,

      transaction_id:
        transaction.id,

      camunda_process_instance_id:
        camundaProcess.id,

      status:
        'running'
    })

  // ====================================================
  // GET FIRST TASK
  // ====================================================

  const tasks =
    await camundaClient.getActiveTasks(
      camundaProcess.id
    )

  const firstTask =
    tasks?.[0]

  let result = null

  // ====================================================
  // AUTO COMPLETE FIRST TASK
  // ====================================================

  /**
   * هنا صار reuse للـ engine
   * بدون duplication
   */

  if (firstTask) {

    result =
      await completeTask({

        taskId:
          firstTask.id,

        userId:
          transaction.user_id,

        payload: {

          /**
           * غالباً أول task ما عنده payload
           * لكن يمكن لاحقاً تضيف defaults
           */

          fields: [],
          files: [],
          templates: [],
          actions: [],

          /**
           * optional gateway variables
           */

          variables: {}
        },

        /**
         * مهم جداً
         * حتى نعرف أنها auto-complete
         */

        isAutoComplete:
          true
      })
  }

  // ====================================================
  // UPDATE TRANSACTION STATUS
  // ====================================================

  await transactionClient.updateStatus(

    transaction.id,

    'in_progress'
  )

  // ====================================================
  // WORKFLOW STARTED EVENT
  // ====================================================

  await outboxRepository.create({

    event_type:
      EVENTS.WORKFLOW_STARTED,

    payload: {

      transactionId:
        transaction.id,

      processId:
        process.id,

      processInstanceId:
        processInstance.id,

      camundaProcessInstanceId:
        camundaProcess.id
    }
  })

  // ====================================================
  // RESPONSE
  // ====================================================

  return {
    message: 'Workflow started successfully',
    data: toStartWorkflow({
      transaction,
      processInstance,
      camundaProcess,
      completeTaskResult: result
    })
  }
}

module.exports = {
  startWorkflow
}