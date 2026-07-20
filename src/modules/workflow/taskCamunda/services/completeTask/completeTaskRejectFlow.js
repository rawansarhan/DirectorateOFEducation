'use strict'

const camundaClient = require('../../../../../core/shared/clients/camunda/camundaClient')
const processInstanceRepository = require('../../repositories/processInstanceRepository')
const transactionRepository =
  require('../../../../transaction/transaction/repositories/transactionRepository')
const {
  buildTransactionSignatureLedger
} = require('../transactionSigningService')
const {
  notifyTransactionOwnerOnReject
} = require('../../../../notification/services/transactionRejectNotificationService')
const {
  withDbTransaction,
  logStep
} = require('./completeTaskHelpers')

async function runRejectFlow ({
  processInstance,
  transaction,
  transactionData,
  currentVersion,
  stage,
  stageSnapshot,
  userId,
  sequelize,
  dbTransaction = null
}) {
  logStep('PHASE_17_REJECT_FLOW_START', { transactionId: transaction.id })

  let activeTasks = await camundaClient.getActiveTasks(
    processInstance.camunda_process_instance_id
  )

  if (activeTasks.length) {
    logStep('REJECT_CANCEL_CAMUNDA', {
      camundaProcessInstanceId: processInstance.camunda_process_instance_id,
      activeTaskCount: activeTasks.length
    })

    await camundaClient.deleteProcessInstance(
      processInstance.camunda_process_instance_id
    )
    activeTasks = []
  }

  await withDbTransaction(sequelize, dbTransaction, async (dbTx) => {
    await processInstanceRepository.update(processInstance.id, {
      status: 'cancelled',
      current_stage_id: null
    }, dbTx)

    await transactionRepository.updateStatus(transaction.id, 'rejected', dbTx)

    transactionData._digital_signatures_ledger =
      await buildTransactionSignatureLedger(transaction.id)

    await transactionRepository.updateDataOptimistic(
      transaction.id,
      transactionData,
      currentVersion,
      dbTx
    )
  })

  logStep('REJECT_FLOW_DONE', {
    transactionId: transaction.id,
    workflowStatus: 'rejected'
  })

  notifyTransactionOwnerOnReject({
    transaction,
    stage,
    note: stageSnapshot.note || '',
    processDefinitionId: processInstance.process_definition_id,
    processInstanceId: processInstance.id,
    sentByUserId: userId
  }).catch(() => {})

  return {
    workflowStatus: 'rejected',
    nextStageId: null,
    currentVersion,
    transactionData
  }
}

module.exports = {
  runRejectFlow
}
