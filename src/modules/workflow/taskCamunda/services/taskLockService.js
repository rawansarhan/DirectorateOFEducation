'use strict'

const camundaClient = require('../../../../core/shared/clients/camunda/camundaClient')
const processInstanceRepository = require('../repositories/processInstanceRepository')

const TASK_LOCK_TTL_MS = Number(process.env.TASK_LOCK_TTL_MS || 30 * 60 * 1000)

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

async function acquireTaskLock ({ processInstanceId, taskId, userId }) {
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
      await processInstanceRepository.clearTaskLock(instance, transaction)
    }

    if (isLockedByOther(instance, taskId, userId, now)) {
      throw buildTaskLockError({
        message: 'المعاملة مقفلة لموظف آخر. لا يمكن التعديل في نفس الوقت.',
        code: 'TASK_LOCKED_BY_ANOTHER',
        lockedBy: instance.task_lock_user_id,
        lockedUntil: instance.task_lock_expires_at
      })
    }

    const expiresAt = new Date(now.getTime() + TASK_LOCK_TTL_MS)

    await processInstanceRepository.updateInstance(
      instance,
      {
        task_lock_user_id: userId,
        task_lock_task_id: taskId,
        task_locked_at: now,
        task_lock_expires_at: expiresAt
      },
      transaction
    )

    await transaction.commit()

    try {
      await camundaClient.claimTask(taskId, userId)
    } catch (claimError) {
      // DB lock is the source of truth; Camunda claim may fail if already claimed by same user
    }

    return {
      locked_by: userId,
      task_id: taskId,
      locked_at: now,
      locked_until: expiresAt
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
  userId,
  refresh = true
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
      throw buildTaskLockError({
        message: 'انتهت صلاحية قفل المعاملة. افتح تفاصيل المهمة من جديد.',
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
          : 'يجب فتح تفاصيل المهمة أولاً لاستلام المعاملة.',
        code: isLockedByOther(instance, taskId, userId, now)
          ? 'TASK_LOCKED_BY_ANOTHER'
          : 'TASK_LOCK_REQUIRED',
        lockedBy: instance.task_lock_user_id,
        lockedUntil: instance.task_lock_expires_at
      })
    }

    if (refresh) {
      const expiresAt = new Date(now.getTime() + TASK_LOCK_TTL_MS)

      await processInstanceRepository.updateInstance(
        instance,
        { task_lock_expires_at: expiresAt },
        transaction
      )
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

module.exports = {
  acquireTaskLock,
  assertTaskLockHolder,
  releaseTaskLock,
  TASK_LOCK_TTL_MS
}
