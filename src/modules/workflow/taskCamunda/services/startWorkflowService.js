const {
  transactionRepository,
  getTransactionById,
  updateTransactionStatus
} = require('../../../transaction/public')

const processRepository =
  require('../../processDefinition/repositories/processRepository')

const camundaClient =
  require('../../../../core/shared/clients/camunda/camundaClient')

const processInstanceRepository =
  require('../repositories/processInstanceRepository')

const {
  completeTask,
  buildAutoCompleteAuthPayload
} = require('./completeTaskService')
const { toStartWorkflow } = require('../mappers/startWorkflowMapper')

async function rollbackCamundaProcess (camundaProcessInstanceId) {
  if (!camundaProcessInstanceId) {
    return
  }

  try {
    await camundaClient.deleteProcessInstance(camundaProcessInstanceId)
  } catch {
    // best-effort compensation
  }
}

// ======================================================
// START WORKFLOW
// ======================================================

async function startWorkflow ({
  transactionId,
  processCode,
  dbTransaction = null,
  transactionRow = null,
  submissionPayload = null
}) {
  const [transaction, process] = await Promise.all([
    transactionRow
      ? Promise.resolve(transactionRow)
      : (
        dbTransaction
          ? transactionRepository.findById(transactionId, dbTransaction)
          : getTransactionById(transactionId)
      ),
    processRepository.findByCode(processCode)
  ])

  if (!transaction) {
    throw new Error('Transaction not found')
  }

  if (transaction.status !== 'submitted') {
    throw new Error('Transaction must be submitted first')
  }

  if (!process) {
    throw new Error('Process not found')
  }

  if (!process.is_active) {
    throw new Error('Process is inactive')
  }

  if (!process.camunda_process_key) {
    throw new Error('Missing Camunda process key')
  }

  let camundaProcess = null

  try {
    camundaProcess = await camundaClient.startProcess(
      process.camunda_process_key,
      transaction.id
    )

    const processInstance = await processInstanceRepository.create({
      process_definition_id: process.id,
      transaction_id: transaction.id,
      camunda_process_instance_id: camundaProcess.id,
      status: 'running'
    }, dbTransaction)

    const tasks = await camundaClient.getActiveTasks(camundaProcess.id)
    const firstTask = tasks?.[0]
    let result = null

    if (firstTask) {
      const autoPayload = await buildAutoCompleteAuthPayload(
        submissionPayload || transaction.data || {}
      )

      if (!autoPayload.widgets.length) {
        throw new Error(
          'widgets[] غير موجودة على المعاملة — أعد submit مع الاستمارة كاملة'
        )
      }

      result = await completeTask({
        taskId: firstTask.id,
        userId: transaction.user_id,
        payload: autoPayload,
        isAutoComplete: true,
        dbTransaction
      })
    }

    if (dbTransaction) {
      await transactionRepository.updateStatus(
        transaction.id,
        'in_progress',
        dbTransaction
      )
    } else {
      await updateTransactionStatus(transaction.id, 'in_progress')
    }

    const transactionPlain = typeof transaction.get === 'function'
      ? transaction.get({ plain: true })
      : transaction

    return {
      message: 'Workflow started successfully',
      data: toStartWorkflow({
        transaction: transactionPlain,
        processInstance,
        camundaProcess,
        completeTaskResult: result
      })
    }
  } catch (error) {
    await rollbackCamundaProcess(camundaProcess?.id)
    throw error
  }
}

module.exports = {
  startWorkflow
}
