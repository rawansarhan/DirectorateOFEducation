'use strict'

const camundaClient = require('../../../../core/shared/clients/camunda/camundaClient')
const processInstanceRepository = require('../repositories/processInstanceRepository')
const employeeTaskRepository = require('../repositories/employeeTaskRepository')
const stageRepository = require('../../processDefinition/repositories/stageRepository')
const transactionRepository =
  require('../../../transaction/public').transactionRepository
const {
  invalidateEmployeeTasksForUser,
  invalidateEmployeeTaskStats
} = require('../../../../core/cache/apiCacheService')
const { formatTransactionDate } = require('../utils/employeeTaskFormatters')
const {
  userMatchesAssigneeRoute
} = require('./taskAssignmentRoutingService')
const {
  getTaskLockEntry,
  isTaskLockExpired,
  isTaskLockedByOther,
  isTaskLockedByUser,
  buildTaskLocksPayload,
  removeTaskLockEntry,
  normalizeTaskLocks,
  syncLegacyLockColumns
} = require('../utils/processInstanceTaskLocks')

function clearLockFieldsOnInstance (instance) {
  instance.task_lock_user_id = null
  instance.task_lock_task_id = null
  instance.task_locked_at = null
  instance.task_lock_expires_at = null
  instance.task_locks = {}
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

function buildTaskLockStatus (processInstance, taskId, userId) {
  const now = new Date()
  const entry = getTaskLockEntry(processInstance, taskId)
  const hasActiveLock = Boolean(entry?.user_id) && !isTaskLockExpired(entry, now)
  const lockedByMe = hasActiveLock && Number(entry.user_id) === Number(userId)
  const lockedByOther = hasActiveLock && !lockedByMe

  return {
    is_locked: hasActiveLock,
    locked_by_me: lockedByMe,
    locked_by_user_id: hasActiveLock ? entry.user_id : null,
    locked_at: hasActiveLock
      ? formatTransactionDate(entry.locked_at)
      : null,
    can_pickup: !hasActiveLock || lockedByMe,
    can_release: lockedByMe
  }
}

async function userCanAccessTaskStage ({
  userId,
  processDefinitionId,
  taskDefinitionKey,
  transactionId = null
}) {
  if (!userId || !processDefinitionId || !taskDefinitionKey) {
    return false
  }

  const roleIds = await employeeTaskRepository.getUserRoleIds(userId)

  if (!roleIds.length) {
    return false
  }

  const stage = await stageRepository.findByCodeAndProcess(
    processDefinitionId,
    taskDefinitionKey
  )

  if (!stage) {
    return false
  }

  if (transactionId) {
    const businessTransaction = await transactionRepository.findById(transactionId)
    const routeMatch = userMatchesAssigneeRoute(
      roleIds,
      businessTransaction?.data,
      stage.code
    )

    if (routeMatch === true) {
      return true
    }

    if (routeMatch === false) {
      return false
    }
  }

  const { stageIds } =
    await employeeTaskRepository.getAccessibleStageContext(roleIds)

  return stageIds.includes(stage.id)
}

async function clearLockIfHolderLostStageAccess ({
  instance,
  taskId,
  requesterUserId,
  taskDefinitionKey,
  transaction,
  now = new Date()
}) {
  const entry = getTaskLockEntry(instance, taskId)

  if (
    !entry?.user_id ||
    Number(entry.user_id) === Number(requesterUserId) ||
    isTaskLockExpired(entry, now) ||
    !taskDefinitionKey
  ) {
    return
  }

  const holderStillAllowed = await userCanAccessTaskStage({
    userId: entry.user_id,
    processDefinitionId: instance.process_definition_id,
    taskDefinitionKey,
    transactionId: instance.transaction_id
  })

  if (!holderStillAllowed) {
    const taskLocks = removeTaskLockEntry(instance, taskId)
    await processInstanceRepository.updateTaskLocks(instance, taskLocks, transaction)
    instance.task_locks = taskLocks
    Object.assign(instance, syncLegacyLockColumns(taskLocks))
  }
}

async function clearExpiredTaskLocksOnInstance ({
  instance,
  transaction,
  now = new Date()
}) {
  const locks = normalizeTaskLocks(instance.task_locks)
  const expired = []

  for (const [taskId, entry] of Object.entries(locks)) {
    if (entry?.user_id && isTaskLockExpired(entry, now)) {
      expired.push({ taskId, userId: entry.user_id })
      delete locks[taskId]
    }
  }

  if (!expired.length) {
    return null
  }

  await processInstanceRepository.updateTaskLocks(instance, locks, transaction)
  instance.task_locks = locks
  Object.assign(instance, syncLegacyLockColumns(locks))

  return expired
}

async function releaseExpiredTaskLocksForProcessInstances (instances = []) {
  const now = new Date()
  const candidates = instances.filter((instance) => {
    const locks = normalizeTaskLocks(instance?.task_locks)
    return Object.values(locks).some(
      entry => entry?.user_id && isTaskLockExpired(entry, now)
    )
  })

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

      const cleared = await clearExpiredTaskLocksOnInstance({
        instance,
        transaction,
        now
      })

      if (!cleared?.length) {
        continue
      }

      clearLockFieldsOnInstance(candidate)
      Object.assign(candidate, syncLegacyLockColumns(instance.task_locks))

      for (const item of cleared) {
        unclaimTaskIds.add(item.taskId)
        affectedUserIds.add(item.userId)
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
    const expiredLocks = await clearExpiredTaskLocksOnInstance({
      instance,
      transaction,
      now
    })

    await clearLockIfHolderLostStageAccess({
      instance,
      taskId,
      requesterUserId: userId,
      taskDefinitionKey,
      transaction,
      now
    })

    if (isTaskLockedByOther(instance, taskId, userId, now)) {
      const entry = getTaskLockEntry(instance, taskId)

      throw buildTaskLockError({
        message: 'المهمة مقفلة لموظف آخر. لا يمكن استلامها في نفس الوقت.',
        code: 'TASK_LOCKED_BY_ANOTHER',
        lockedBy: entry?.user_id || null,
        lockedUntil: entry?.expires_at || null
      })
    }

    const taskLocks = buildTaskLocksPayload(instance, taskId, userId, now)

    await processInstanceRepository.updateTaskLocks(instance, taskLocks, transaction)
    instance.task_locks = taskLocks
    Object.assign(instance, syncLegacyLockColumns(taskLocks))

    await transaction.commit()

    if (expiredLocks?.length) {
      for (const item of expiredLocks) {
        await unclaimCamundaTaskSafe(item.taskId)
      }
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
    const expiredLocks = await clearExpiredTaskLocksOnInstance({
      instance,
      transaction,
      now
    })

    if (expiredLocks?.length) {
      await transaction.commit()

      for (const item of expiredLocks) {
        await unclaimCamundaTaskSafe(item.taskId)

        if (item.userId) {
          invalidateEmployeeTasksForUser(item.userId).catch(() => {})
        }
      }

      invalidateEmployeeTaskStats().catch(() => {})

      throw buildTaskLockError({
        message:
          'انتهت صلاحية قفل المهمة. استلمها مجدداً عبر POST /api/workflow/tasks/{taskId}/pickup.',
        code: 'TASK_LOCK_EXPIRED'
      })
    }

    if (!isTaskLockedByUser(instance, taskId, userId, now)) {
      throw buildTaskLockError({
        message: isTaskLockedByOther(instance, taskId, userId, now)
          ? 'المهمة مقفلة لموظف آخر. لا يمكن التعديل في نفس الوقت.'
          : 'يجب استلام المهمة أولاً عبر POST /api/workflow/tasks/{taskId}/pickup.',
        code: isTaskLockedByOther(instance, taskId, userId, now)
          ? 'TASK_LOCKED_BY_ANOTHER'
          : 'TASK_LOCK_REQUIRED',
        lockedBy: getTaskLockEntry(instance, taskId)?.user_id || null,
        lockedUntil: getTaskLockEntry(instance, taskId)?.expires_at || null
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

    if (isTaskLockedByUser(instance, taskId, userId)) {
      const taskLocks = removeTaskLockEntry(instance, taskId)
      await processInstanceRepository.updateTaskLocks(instance, taskLocks, transaction)
      instance.task_locks = taskLocks
      Object.assign(instance, syncLegacyLockColumns(taskLocks))

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
    const entry = getTaskLockEntry(instance, taskId)

    if (!entry?.user_id || isTaskLockExpired(entry, now)) {
      await transaction.commit()
      throw buildTaskLockError({
        message: 'لا يوجد قفل نشط على هذه المهمة.',
        code: 'TASK_LOCK_NOT_HELD'
      })
    }

    if (Number(entry.user_id) !== Number(userId)) {
      throw buildTaskLockError({
        message: 'لا يمكنك إلغاء استلام مهمة مقفولة لموظف آخر.',
        code: 'TASK_LOCK_NOT_OWNER',
        lockedBy: entry.user_id
      })
    }

    const taskLocks = removeTaskLockEntry(instance, taskId)
    await processInstanceRepository.updateTaskLocks(instance, taskLocks, transaction)
    instance.task_locks = taskLocks
    Object.assign(instance, syncLegacyLockColumns(taskLocks))
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
