'use strict'

const camundaClient = require('../../../../../core/shared/clients/camunda/camundaClient')
const {
  transactionRepository,
  getTransactionById
} = require('../../../../transaction/public')
const processInstanceRepository = require('../../repositories/processInstanceRepository')
const stageRepository = require('../../../processDefinition/repositories/stageRepository')
const { assertTaskLockHolder } = require('../taskLockService')
const { enrichCamundaTaskNotFoundError } = require('../../../../../core/utils/errorMessageHelper')
const { logStep } = require('./completeTaskHelpers')

async function loadCompleteTaskContext ({
  taskId,
  userId,
  payload,
  isAutoComplete = false,
  dbTransaction = null
}) {
  logStep('PHASE_1_LOAD_TASK', { taskId })

  let task

  try {
    task = await camundaClient.getTaskById(taskId)
  } catch (err) {
    throw await enrichCamundaTaskNotFoundError(
      err,
      taskId,
      (id) => camundaClient.getTaskNotFoundDiagnostics(id)
    )
  }

  if (!task) {
    throw new Error('Task not found')
  }

  logStep('TASK_LOADED', {
    taskId: task.id,
    taskDefinitionKey: task.taskDefinitionKey,
    processInstanceId: task.processInstanceId
  })

  logStep('PHASE_2_LOAD_PROCESS_INSTANCE')

  const processInstance = await processInstanceRepository.findByCamundaId(
    task.processInstanceId,
    dbTransaction
  )

  if (!processInstance) {
    throw new Error('Process instance not found')
  }

  logStep('PROCESS_INSTANCE_LOADED', {
    processInstanceId: processInstance.id,
    transactionId: processInstance.transaction_id,
    status: processInstance.status
  })

  logStep('PHASE_3_LOAD_TRANSACTION', {
    transactionId: processInstance.transaction_id
  })

  const transaction = dbTransaction
    ? await transactionRepository.findById(processInstance.transaction_id, dbTransaction)
    : await getTransactionById(processInstance.transaction_id)

  if (!transaction) {
    throw new Error('Transaction not found')
  }

  const currentVersion = payload.expected_version ?? transaction.version

  logStep('TRANSACTION_LOADED', {
    transactionId: transaction.id,
    idProcess: transaction.id_process || '',
    version: currentVersion,
    status: transaction.status
  })

  if (!isAutoComplete) {
    logStep('PHASE_4_ASSERT_TASK_LOCK', { taskId: task.id, userId })

    await assertTaskLockHolder({
      processInstanceId: processInstance.id,
      taskId: task.id,
      userId
    })

    logStep('TASK_LOCK_OK', { taskId: task.id, userId })
  } else {
    logStep('PHASE_4_SKIP_TASK_LOCK', { reason: 'auto_complete' })
  }

  logStep('PHASE_5_LOAD_STAGE', { taskDefinitionKey: task.taskDefinitionKey })

  const stage = await stageRepository.findByCodeAndProcess(
    processInstance.process_definition_id,
    task.taskDefinitionKey
  )

  if (!stage) {
    throw new Error('Stage not found')
  }

  logStep('STAGE_LOADED', {
    stageId: stage.id,
    stageCode: stage.code,
    stageName: stage.name,
    stageType: stage.type
  })

  return {
    task,
    processInstance,
    transaction,
    stage,
    currentVersion
  }
}

module.exports = {
  loadCompleteTaskContext
}
