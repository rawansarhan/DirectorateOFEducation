'use strict'

const camundaClient = require('../../../../core/shared/clients/camunda/camundaClient')
const { transactionRepository, parsePositiveInt } = require('../../../transaction/public')
const processInstanceRepository = require('../repositories/processInstanceRepository')
const employeeTaskRepository = require('../repositories/employeeTaskRepository')
const stageRepository = require('../../processDefinition/repositories/stageRepository')
const { acquireTaskLock } = require('./taskLockService')
const { retryWithBackoff } = require('../../../../core/utils/retryWithBackoff')

function createResolveError (code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

async function resolveDocumentSubmitTask ({
  transactionId,
  userId,
  acquireLock = true
}) {
  const numericTransactionId = parsePositiveInt(
    transactionId,
    'معرّف المعاملة'
  )

  const transaction = await transactionRepository.findById(numericTransactionId)

  if (!transaction) {
    throw createResolveError('TRANSACTION_NOT_FOUND', 'المعاملة غير موجودة')
  }

  const processInstance = await processInstanceRepository.findByTransactionId(
    numericTransactionId
  )

  if (!processInstance) {
    throw createResolveError(
      'PROCESS_INSTANCE_NOT_FOUND',
      'لم يبدأ سير العمل لهذه المعاملة بعد — تأكد من submit أولاً'
    )
  }

  if (processInstance.status !== 'running') {
    throw createResolveError(
      'WORKFLOW_NOT_ACTIVE',
      'سير العمل غير نشط لهذه المعاملة'
    )
  }

  const activeTasks = await retryWithBackoff(
    () =>
      camundaClient.getActiveTasks(processInstance.camunda_process_instance_id),
    { label: `resolveDocumentSubmitTask.activeTasks:${numericTransactionId}` }
  )

  if (!Array.isArray(activeTasks) || !activeTasks.length) {
    throw createResolveError(
      'NO_ACTIVE_TASK',
      'لا توجد مهمة نشطة على هذه المعاملة في Camunda'
    )
  }

  const roleIds = await employeeTaskRepository.getUserRoleIds(userId)

  if (!roleIds.length) {
    throw createResolveError(
      'FORBIDDEN',
      'لا تملك صلاحية تنفيذ مهام على هذه المعاملة'
    )
  }

  const { stageIds } =
    await employeeTaskRepository.getAccessibleStageContext(roleIds)

  let matchedTask = null
  let matchedStage = null

  for (const task of activeTasks) {
    const stage = await stageRepository.findByCodeAndProcess(
      processInstance.process_definition_id,
      task.taskDefinitionKey
    )

    if (stage && stageIds.includes(stage.id)) {
      matchedTask = task
      matchedStage = stage
      break
    }
  }

  if (!matchedTask) {
    throw createResolveError(
      'FORBIDDEN',
      'لا توجد مهمة نشطة مخصصة لدورك على هذه المعاملة'
    )
  }

  if (acquireLock) {
    await acquireTaskLock({
      processInstanceId: processInstance.id,
      taskId: matchedTask.id,
      userId,
      taskDefinitionKey: matchedTask.taskDefinitionKey
    })
  }

  return {
    taskId: matchedTask.id,
    task: matchedTask,
    stage: matchedStage,
    processInstance,
    transaction
  }
}

module.exports = {
  resolveDocumentSubmitTask
}
