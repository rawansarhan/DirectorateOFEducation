'use strict'

const camundaClient = require('../../../../core/shared/clients/camunda/camundaClient')
const taskDetailsRepository = require('../repositories/taskDetailsRepository')
const processInstanceRepository = require('../repositories/processInstanceRepository')
const stageRepository = require('../../processDefinition/repositories/stageRepository')
const stageConfigRepository = require('../../stageConfig/repositories/stageConfigRepository')
const transactionClient = require('../../../../core/shared/clients/transaction/transactionClient')
const { acquireTaskLock } = require('./taskLockService')
const { toTaskDetails } = require('../mappers/taskCamundaMapper')
const { retryWithBackoff } = require('../../../../core/utils/retryWithBackoff')
const {
  formatTransactionHistoryForDisplay,
  enrichHistoryTemplatesWithDocumentInstances
} = require('../utils/transactionHistoryDisplay')
const documentInstanceRepository = require('../../../transaction/document/repositories/documentInstanceRepository')
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

async function resolveActiveStageConfig ({ task, processInstance }) {
  if (!task?.taskDefinitionKey || !processInstance?.process_definition_id) {
    return {
      activeStage: processInstance?.current_stage || null,
      stageConfig: processInstance?.current_stage?.stage_config || null
    }
  }

  const activeStage = await stageRepository.findByCodeAndProcess(
    processInstance.process_definition_id,
    task.taskDefinitionKey
  )

  if (!activeStage) {
    return {
      activeStage: processInstance?.current_stage || null,
      stageConfig: processInstance?.current_stage?.stage_config || null
    }
  }

  if (processInstance.current_stage_id !== activeStage.id) {
    await processInstanceRepository.update(processInstance.id, {
      current_stage_id: activeStage.id
    })
    processInstance.current_stage_id = activeStage.id
  }

  const stageConfig = await stageConfigRepository.findByStageId(activeStage.id)

  return { activeStage, stageConfig }
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

  await acquireTaskLock({
    processInstanceId: processInstance.id,
    taskId: task.id,
    userId,
    taskDefinitionKey: task.taskDefinitionKey
  })

  const { activeStage, stageConfig } = await resolveActiveStageConfig({
    task,
    processInstance
  })

  const previousStagesData = enrichHistoryTemplatesWithDocumentInstances(
    formatTransactionHistoryForDisplay(transaction?.data || {}, transaction),
    transaction?.id
      ? await documentInstanceRepository.findAllByTransactionId(transaction.id)
      : []
  )

  return {
    message: 'تم جلب تفاصيل المهمة بنجاح',
    data: toTaskDetails({
      task,
      processInstance,
      transaction,
      previousStagesData,
      activeStage,
      currentStageConfig: stageConfig?.config_json || {},
      processDefinition: processInstance.process_definition
    })
  }
}

module.exports = {
  getTaskDetails
}
