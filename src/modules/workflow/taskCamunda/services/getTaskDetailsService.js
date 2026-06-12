'use strict'

const camundaClient = require('../../../../core/shared/clients/camunda/camundaClient')
const taskDetailsRepository = require('../repositories/taskDetailsRepository')
const transactionClient = require('../../../../core/shared/clients/transaction/transactionClient')
const { acquireTaskLock } = require('./taskLockService')
const { toTaskDetails } = require('../mappers/taskCamundaMapper')
const { retryWithBackoff } = require('../../../../core/utils/retryWithBackoff')
const {
  formatTransactionHistoryForDisplay
} = require('../utils/transactionHistoryDisplay')
const { enrichCamundaTaskNotFoundError } = require('../../../../core/utils/errorMessageHelper')

function createTaskDetailsError (code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

async function fetchCamundaTask (taskId) {
  return retryWithBackoff(async () => {
    try {
      return await camundaClient.getTaskById(taskId)
    } catch (err) {
      if (err?.code === 'CAMUNDA_TASK_NOT_FOUND') {
        throw await enrichCamundaTaskNotFoundError(
          err,
          taskId,
          (id) => camundaClient.getTaskNotFoundDiagnostics(id)
        )
      }

      if (err.response?.status === 404) {
        throw createTaskDetailsError(
          'TASK_NOT_FOUND',
          'المهمة غير موجودة أو لم تعد نشطة في Camunda'
        )
      }

      throw err
    }
  }, { label: `camunda.getTaskById:${taskId}` })
}

async function fetchProcessInstance (camundaProcessInstanceId) {
  const processInstance = await retryWithBackoff(
    () =>
      taskDetailsRepository.findProcessInstanceByCamundaId(
        camundaProcessInstanceId
      ),
    { label: `taskDetails.findProcessInstance:${camundaProcessInstanceId}` }
  )

  if (!processInstance) {
    throw createTaskDetailsError(
      'PROCESS_INSTANCE_NOT_FOUND',
      'مثيل سير العمل غير موجود — تأكد أن المعاملة مرتبطة بعملية Camunda نشطة'
    )
  }

  return processInstance
}

async function resolveTransaction (processInstance) {
  const embedded = processInstance.transaction

  if (embedded?.data != null) {
    return embedded
  }

  if (!processInstance.transaction_id) {
    throw createTaskDetailsError(
      'TRANSACTION_NOT_FOUND',
      'المعاملة غير موجودة أو غير مرتبطة بهذه المهمة'
    )
  }

  const transaction = await transactionClient.getTransactionById(
    processInstance.transaction_id
  )

  if (!transaction) {
    throw createTaskDetailsError(
      'TRANSACTION_NOT_FOUND',
      'المعاملة غير موجودة أو غير مرتبطة بهذه المهمة'
    )
  }

  if (embedded?.user && !transaction.user) {
    transaction.user = embedded.user
  }

  return transaction
}

async function getTaskDetails ({ taskId, userId }) {
  if (!taskId || !String(taskId).trim()) {
    throw createTaskDetailsError(
      'VALIDATION_ERROR',
      'taskId مطلوب — أرسل معرّف المهمة في المسار'
    )
  }

  const task = await fetchCamundaTask(taskId)

  if (!task) {
    throw createTaskDetailsError(
      'TASK_NOT_FOUND',
      'المهمة غير موجودة أو لم تعد نشطة في Camunda'
    )
  }

  const processInstance = await fetchProcessInstance(task.processInstanceId)
  const transaction = await resolveTransaction(processInstance)

  const taskLock = await acquireTaskLock({
    processInstanceId: processInstance.id,
    taskId: task.id,
    userId,
    taskDefinitionKey: task.taskDefinitionKey
  })

  const previousStagesData = formatTransactionHistoryForDisplay(
    transaction?.data || {}
  )

  return {
    message: 'تم جلب تفاصيل المهمة بنجاح',
    data: toTaskDetails({
      task,
      processInstance,
      transaction,
      previousStagesData,
      processDefinition: processInstance.process_definition
    })
  }
}

module.exports = {
  getTaskDetails
}
