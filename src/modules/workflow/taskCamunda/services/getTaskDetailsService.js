'use strict'

const camundaClient = require('../../../../core/shared/clients/camunda/camundaClient')
const processInstanceRepository = require('../repositories/processInstanceRepository')
const stageRepository = require('../../processDefinition/repositories/stageRepository')
const stageConfigRepository = require('../../stageConfig/repositories/stageConfigRepository')
const {
  documentInstanceRepository,
  getTransactionById
} = require('../../../transaction/public')
const {
  acquireTaskLock,
  releaseTaskLockStrict,
  buildTaskLockStatus
} = require('./taskLockService')
const { toTaskDetails } = require('../mappers/taskDetailsMapper')
const { retryWithBackoff } = require('../../../../core/utils/retryWithBackoff')
const {
  formatTransactionHistoryForDisplay,
  enrichHistoryTemplatesWithDocumentInstances
} = require('../utils/transactionHistoryDisplay')
const { enrichCamundaTaskNotFoundError } = require('../../../../core/utils/errorMessageHelper')
const {
  KEYS,
  getOrLoad,
  invalidateTaskDetails
} = require('../../../../core/cache/apiCacheService')
const {
  TASK_DETAILS_CACHE_TTL_SECONDS,
  CURRENT_STAGE_CACHE_TTL_SECONDS
} = require('../../../../core/config/env')
const {
  buildAssignmentsResponseFromConfig
} = require('./taskAssignmentRoutingService')
const {
  resolveDatePickerBoundsInConfig
} = require('../../../../core/utils/dateBound')

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
      processInstanceRepository.findByCamundaIdWithDetails(
        camundaProcessInstanceId
      ),
    { label: `processInstance.findByCamundaIdWithDetails:${camundaProcessInstanceId}` }
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

  const transaction = await getTransactionById(
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

/**
 * قراءة مكاشة للمرحلة الحالية + إعدادها (قراءة صرفة بدون أثر جانبي).
 * المفتاح: (process_definition_id, taskDefinitionKey) — ثابت لكل مرحلة.
 * يُبطَّل عند تعديل إعداد المرحلة (invalidateStageConfig).
 */
async function loadCachedCurrentStage ({ processDefinitionId, taskDefinitionKey }) {
  return getOrLoad(
    KEYS.currentStage(processDefinitionId, taskDefinitionKey),
    async () => {
      const activeStage = await stageRepository.findByCodeAndProcess(
        processDefinitionId,
        taskDefinitionKey
      )

      if (!activeStage) {
        return { activeStage: null, stageConfig: null }
      }

      const stageConfig = await stageConfigRepository.findByStageId(activeStage.id)

      return { activeStage, stageConfig }
    },
    {
      label: `current-stage:${processDefinitionId}:${taskDefinitionKey}`,
      ttlSeconds: CURRENT_STAGE_CACHE_TTL_SECONDS
    }
  )
}

async function resolveActiveStageConfig ({ task, processInstance }) {
  if (!task?.taskDefinitionKey || !processInstance?.process_definition_id) {
    return {
      activeStage: processInstance?.current_stage || null,
      stageConfig: processInstance?.current_stage?.stage_config || null
    }
  }

  const { activeStage, stageConfig } = await loadCachedCurrentStage({
    processDefinitionId: processInstance.process_definition_id,
    taskDefinitionKey: task.taskDefinitionKey
  })

  if (!activeStage) {
    return {
      activeStage: processInstance?.current_stage || null,
      stageConfig: processInstance?.current_stage?.stage_config || null
    }
  }

  // الأثر الجانبي (مزامنة current_stage_id) يبقى خارج الكاش
  if (processInstance.current_stage_id !== activeStage.id) {
    await processInstanceRepository.update(processInstance.id, {
      current_stage_id: activeStage.id
    })
    processInstance.current_stage_id = activeStage.id
  }

  return { activeStage, stageConfig }
}

async function loadTaskDetailsContext ({ taskId, userId }) {
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

  const configJson = stageConfig?.config_json || {}
  const assignments = buildAssignmentsResponseFromConfig(configJson)

  const details = toTaskDetails({
    task,
    processInstance,
    transaction,
    previousStagesData,
    activeStage,
    currentStageConfig: configJson,
    processDefinition: processInstance.process_definition,
    assignments
  })

  const task_lock = buildTaskLockStatus(processInstance, task.id, userId)

  return {
    task,
    processInstance,
    details,
    task_lock
  }
}

async function getTaskDetails ({ taskId, userId }) {
  const result = await getOrLoad(
    KEYS.taskDetails(taskId, userId),
    async () => {
      const { details, task_lock } = await loadTaskDetailsContext({ taskId, userId })

      return {
        message: 'تم جلب تفاصيل المهمة بنجاح',
        data: {
          ...details,
          task_lock
        }
      }
    },
    {
      label: `task-details:${taskId}`,
      ttlSeconds: TASK_DETAILS_CACHE_TTL_SECONDS
    }
  )

  // حل حدود التاريخ بعد الكاش حتى لا تتجمّد قيم today/relative
  if (result?.data?.currentStage?.config) {
    return {
      ...result,
      data: {
        ...result.data,
        currentStage: {
          ...result.data.currentStage,
          config: resolveDatePickerBoundsInConfig(result.data.currentStage.config)
        }
      }
    }
  }

  return result
}

async function pickupTask ({ taskId, userId }) {
  const task = await fetchCamundaTask(taskId)

  if (!task) {
    throw createTaskDetailsError(
      'TASK_NOT_FOUND',
      'المهمة غير موجودة أو لم تعد نشطة في Camunda'
    )
  }

  const processInstance = await fetchProcessInstance(task.processInstanceId)
  const initialLock = buildTaskLockStatus(processInstance, task.id, userId)

  if (initialLock.is_locked && !initialLock.locked_by_me) {
    throw createTaskDetailsError(
      'TASK_LOCKED_BY_ANOTHER',
      'هذه المعاملة قد تم استلامها من قبل موظف آخر'
    )
  }

  await acquireTaskLock({
    processInstanceId: processInstance.id,
    taskId: task.id,
    userId,
    taskDefinitionKey: task.taskDefinitionKey
  })

  // حالة القفل تغيّرت → أبطل كاش تفاصيل المهمة لكل المستخدمين
  await invalidateTaskDetails(task.id)

  const { details } = await loadTaskDetailsContext({ taskId, userId })
  const refreshedInstance = await processInstanceRepository.findById(processInstance.id)
  const task_lock = buildTaskLockStatus(refreshedInstance, task.id, userId)

  return {
    message: 'تم استلام المعاملة بنجاح',
    data: {
      ...details,
      task_lock
    }
  }
}

async function releaseTask ({ taskId, userId }) {
  const { task, processInstance } = await loadTaskDetailsContext({ taskId, userId })

  await releaseTaskLockStrict({
    processInstanceId: processInstance.id,
    taskId: task.id,
    userId
  })

  // حالة القفل تغيّرت → أبطل كاش تفاصيل المهمة لكل المستخدمين
  await invalidateTaskDetails(task.id)

  const refreshedInstance = await processInstanceRepository.findById(processInstance.id)
  const task_lock = buildTaskLockStatus(refreshedInstance, task.id, userId)

  return {
    message: 'تم إلغاء استلام المعاملة بنجاح',
    data: {
      task_id: task.id,
      task_lock
    }
  }
}

module.exports = {
  getTaskDetails,
  pickupTask,
  releaseTask
}
