'use strict'

const camundaClient = require('../../../../core/shared/clients/camunda/camundaClient')
const processInstanceRepository = require('../repositories/processInstanceRepository')
const employeeTaskRepository = require('../repositories/employeeTaskRepository')
const stageRepository = require('../../processDefinition/repositories/stageRepository')
const {
  invalidateEmployeeTasksForUser,
  invalidateEmployeeTaskStats
} = require('../../../../core/cache/apiCacheService')
const { formatTransactionDate } = require('../utils/employeeTaskFormatters')

function clearLockFieldsOnInstance (instance) {
  instance.task_lock_user_id = null
  instance.task_lock_task_id = null
  instance.task_locked_at = null
  instance.task_lock_expires_at = null
}

async function unclaimCamundaTaskSafe (taskId) {
  if (!taskId) {
    return
  }

  try {
    await camundaClient.unclaimTask(taskId)
  } catch (_) {
    // ignore Camunda unclaim errors
  }
}

function buildTaskLockError ({
  message,
  code,
  lockedBy = null,
  lockedUntil = null
}) {
  const error = new Error(message)
  error.code = code
  error.lockedBy = lockedBy
  error.lockedUntil = lockedUntil
  return error
}

function isLockExpired (instance, now = new Date()) {
  return instance.task_lock_expires_at && now >= instance.task_lock_expires_at
}

function isLockedByOther (instance, taskId, userId, now = new Date()) {
  if (!instance.task_lock_user_id || isLockExpired(instance, now)) {
    return false
  }

  if (instance.task_lock_task_id !== taskId) {
    return false
  }

  return instance.task_lock_user_id !== userId
}

function buildTaskLockStatus (processInstance, taskId, userId) {
  const now = new Date()
  const hasActiveLock =
    Boolean(processInstance?.task_lock_user_id) &&
    processInstance.task_lock_task_id === taskId &&
    !isLockExpired(processInstance, now)

  const lockedByMe =
    hasActiveLock && processInstance.task_lock_user_id === userId

  const lockedByOther =
    hasActiveLock && processInstance.task_lock_user_id !== userId

  return {
    is_locked: hasActiveLock,
    locked_by_me: lockedByMe,
    locked_by_user_id: hasActiveLock ? processInstance.task_lock_user_id : null,
    locked_at: hasActiveLock
      ? formatTransactionDate(processInstance.task_locked_at)
      : null,
    can_pickup: !hasActiveLock || lockedByMe,
    can_release: lockedByMe
  }
}

async function userCanAccessTaskStage ({
  userId,
  processDefinitionId,
  taskDefinitionKey
}) {
  if (!userId || !processDefinitionId || !taskDefinitionKey) {
    return false
  }

  const roleIds = await employeeTaskRepository.getUserRoleIds(userId)

  if (!roleIds.length) {
    return false
  }

  const { stageIds } =
    await employeeTaskRepository.getAccessibleStageContext(roleIds)

  const stage = await stageRepository.findByCodeAndProcess(
    processDefinitionId,
    taskDefinitionKey
  )

  return Boolean(stage && stageIds.includes(stage.id))
}

async function clearLockIfHolderLostStageAccess ({
  instance,
  taskId,
  requesterUserId,
  taskDefinitionKey,
  transaction,
  now = new Date()
}) {
  if (
    !instance.task_lock_user_id ||
    instance.task_lock_user_id === requesterUserId ||
    instance.task_lock_task_id !== taskId ||
    isLockExpired(instance, now) ||
    !taskDefinitionKey
  ) {
    return
  }

  const holderStillAllowed = await userCanAccessTaskStage({
    userId: instance.task_lock_user_id,
    processDefinitionId: instance.process_definition_id,
    taskDefinitionKey
  })

  if (!holderStillAllowed) {
    await processInstanceRepository.clearTaskLock(instance, transaction)
    clearLockFieldsOnInstance(instance)
  }
}

async function clearExpiredTaskLock ({
  instance,
  transaction,
  now = new Date()
}) {
  if (!instance?.task_lock_user_id || !isLockExpired(instance, now)) {
    return false
  }

  const expiredTaskId = instance.task_lock_task_id
  const expiredUserId = instance.task_lock_user_id

  await processInstanceRepository.clearTaskLock(instance, transaction)
  clearLockFieldsOnInstance(instance)

  return { expiredTaskId, expiredUserId }
}

/**
 * يفك قفل المعاملات التي انتهت مهلة قفلها (legacy — القفل الجديد بدون TTL).
 */
async function releaseExpiredTaskLocksForProcessInstances (instances = []) {
  const now = new Date()
  const candidates = instances.filter(
    (instance) => instance?.task_lock_user_id && isLockExpired(instance, now)
  )

  if (!candidates.length) {
    return
  }

  const sequelize = processInstanceRepository.getSequelize()
  const transaction = await sequelize.transaction()
  const unclaimTaskIds = new Set()
  const affectedUserIds = new Set()

  try {
    for (const candidate of candidates) {
      const instance = await processInstanceRepository.findByIdWithLock(
        candidate.id,
        transaction
      )

      if (!instance) {
        continue
      }

      const cleared = await clearExpiredTaskLock({ instance, transaction, now })

      if (!cleared) {
        continue
      }

      clearLockFieldsOnInstance(candidate)

      if (cleared.expiredTaskId) {
        unclaimTaskIds.add(cleared.expiredTaskId)
      }

      if (cleared.expiredUserId) {
        affectedUserIds.add(cleared.expiredUserId)
      }
    }

    await transaction.commit()
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback()
    }

    throw error
  }

  for (const taskId of unclaimTaskIds) {
    await unclaimCamundaTaskSafe(taskId)
  }

  for (const userId of affectedUserIds) {
    invalidateEmployeeTasksForUser(userId).catch(() => {})
  }

  invalidateEmployeeTaskStats().catch(() => {})
}

async function acquireTaskLock ({
  processInstanceId,
  taskId,
  userId,
  taskDefinitionKey = null
}) {
  const sequelize = processInstanceRepository.getSequelize()
  const transaction = await sequelize.transaction()

  try {
    const instance = await processInstanceRepository.findByIdWithLock(
      processInstanceId,
      transaction
    )

    if (!instance) {
      throw new Error('Process instance not found')
    }

    const now = new Date()
    let unclaimAfterCommit = null

    if (isLockExpired(instance, now)) {
      const cleared = await clearExpiredTaskLock({ instance, transaction, now })
      unclaimAfterCommit = cleared?.expiredTaskId || null
    }

    await clearLockIfHolderLostStageAccess({
      instance,
      taskId,
      requesterUserId: userId,
      taskDefinitionKey,
      transaction,
      now
    })

    if (isLockedByOther(instance, taskId, userId, now)) {
      throw buildTaskLockError({
        message: 'المعاملة مقفلة لموظف آخر. لا يمكن استلامها في نفس الوقت.',
        code: 'TASK_LOCKED_BY_ANOTHER',
        lockedBy: instance.task_lock_user_id,
        lockedUntil: instance.task_lock_expires_at
      })
    }

    await processInstanceRepository.updateInstance(
      instance,
      {
        task_lock_user_id: userId,
        task_lock_task_id: taskId,
        task_locked_at: now,
        task_lock_expires_at: null
      },
      transaction
    )

    await transaction.commit()

    if (unclaimAfterCommit) {
      await unclaimCamundaTaskSafe(unclaimAfterCommit)
    }

    try {
      await camundaClient.claimTask(taskId, userId)
    } catch (claimError) {
      // DB lock is the source of truth; Camunda claim may fail if already claimed by same user
    }

    invalidateEmployeeTasksForUser(userId).catch(() => {})
    invalidateEmployeeTaskStats().catch(() => {})

    return {
      locked_by: userId,
      task_id: taskId,
      locked_at: now
    }
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback()
    }

    throw error
  }
}

async function assertTaskLockHolder ({
  processInstanceId,
  taskId,
  userId
}) {
  const sequelize = processInstanceRepository.getSequelize()
  const transaction = await sequelize.transaction()

  try {
    const instance = await processInstanceRepository.findByIdWithLock(
      processInstanceId,
      transaction
    )

    if (!instance) {
      throw new Error('Process instance not found')
    }

    const now = new Date()

    if (isLockExpired(instance, now)) {
      const cleared = await clearExpiredTaskLock({ instance, transaction, now })
      await transaction.commit()

      if (cleared?.expiredTaskId) {
        await unclaimCamundaTaskSafe(cleared.expiredTaskId)

        if (cleared.expiredUserId) {
          invalidateEmployeeTasksForUser(cleared.expiredUserId).catch(() => {})
        }

        invalidateEmployeeTaskStats().catch(() => {})
      }

      throw buildTaskLockError({
        message:
          'انتهت صلاحية قفل المعاملة. استلمها مجدداً عبر POST /api/workflow/tasks/{taskId}/pickup.',
        code: 'TASK_LOCK_EXPIRED'
      })
    }

    if (
      !instance.task_lock_user_id ||
      instance.task_lock_user_id !== userId ||
      instance.task_lock_task_id !== taskId
    ) {
      throw buildTaskLockError({
        message: isLockedByOther(instance, taskId, userId, now)
          ? 'المعاملة مقفلة لموظف آخر. لا يمكن التعديل في نفس الوقت.'
          : 'يجب استلام المعاملة أولاً عبر POST /api/workflow/tasks/{taskId}/pickup.',
        code: isLockedByOther(instance, taskId, userId, now)
          ? 'TASK_LOCKED_BY_ANOTHER'
          : 'TASK_LOCK_REQUIRED',
        lockedBy: instance.task_lock_user_id,
        lockedUntil: instance.task_lock_expires_at
      })
    }

    await transaction.commit()
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback()
    }

    throw error
  }
}

async function releaseTaskLock ({ processInstanceId, taskId, userId }) {
  const sequelize = processInstanceRepository.getSequelize()
  const transaction = await sequelize.transaction()

  try {
    const instance = await processInstanceRepository.findByIdWithLock(
      processInstanceId,
      transaction
    )

    if (!instance) {
      await transaction.commit()
      return
    }

    if (
      instance.task_lock_user_id === userId &&
      instance.task_lock_task_id === taskId
    ) {
      await processInstanceRepository.clearTaskLock(instance, transaction)
      clearLockFieldsOnInstance(instance)

      try {
        await camundaClient.unclaimTask(taskId)
      } catch (unclaimError) {
        // ignore Camunda unclaim errors
      }
    }

    await transaction.commit()
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback()
    }

    throw error
  }
}

async function releaseTaskLockStrict ({ processInstanceId, taskId, userId }) {
  const sequelize = processInstanceRepository.getSequelize()
  const transaction = await sequelize.transaction()

  try {
    const instance = await processInstanceRepository.findByIdWithLock(
      processInstanceId,
      transaction
    )

    if (!instance) {
      throw new Error('Process instance not found')
    }

    const now = new Date()

    if (isLockExpired(instance, now)) {
      await clearExpiredTaskLock({ instance, transaction, now })
      await transaction.commit()
      throw buildTaskLockError({
        message: 'لا يوجد قفل نشط على هذه المعاملة.',
        code: 'TASK_LOCK_NOT_HELD'
      })
    }

    if (!instance.task_lock_user_id || instance.task_lock_task_id !== taskId) {
      await transaction.commit()
      throw buildTaskLockError({
        message: 'لا يوجد قفل نشط على هذه المهمة.',
        code: 'TASK_LOCK_NOT_HELD'
      })
    }

    if (instance.task_lock_user_id !== userId) {
      throw buildTaskLockError({
        message: 'لا يمكنك إلغاء استلام معاملة مقفولة لموظف آخر.',
        code: 'TASK_LOCK_NOT_OWNER',
        lockedBy: instance.task_lock_user_id
      })
    }

    await processInstanceRepository.clearTaskLock(instance, transaction)
    clearLockFieldsOnInstance(instance)
    await transaction.commit()

    try {
      await camundaClient.unclaimTask(taskId)
    } catch (unclaimError) {
      // ignore Camunda unclaim errors
    }

    invalidateEmployeeTasksForUser(userId).catch(() => {})
    invalidateEmployeeTaskStats().catch(() => {})

    return {
      released: true,
      task_id: taskId
    }
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback()
    }

    throw error
  }
}

module.exports = {
  acquireTaskLock,
  assertTaskLockHolder,
  releaseTaskLock,
  releaseTaskLockStrict,
  releaseExpiredTaskLocksForProcessInstances,
  buildTaskLockStatus
}
