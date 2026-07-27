'use strict'

function normalizeTaskLocks (raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {}
  }

  return raw
}

function getTaskLockEntry (instance, taskId) {
  if (!instance || !taskId) {
    return null
  }

  const locks = normalizeTaskLocks(instance.task_locks)
  const entry = locks[taskId]

  if (entry?.user_id) {
    return entry
  }

  if (
    instance.task_lock_task_id === taskId &&
    instance.task_lock_user_id
  ) {
    return {
      user_id: instance.task_lock_user_id,
      locked_at: instance.task_locked_at || null,
      expires_at: instance.task_lock_expires_at || null
    }
  }

  return null
}

function isTaskLockExpired (entry, now = new Date()) {
  return Boolean(entry?.expires_at && now >= new Date(entry.expires_at))
}

function isTaskLockedByOther (instance, taskId, userId, now = new Date()) {
  const entry = getTaskLockEntry(instance, taskId)

  if (!entry || isTaskLockExpired(entry, now)) {
    return false
  }

  return Number(entry.user_id) !== Number(userId)
}

function isTaskLockedByUser (instance, taskId, userId, now = new Date()) {
  const entry = getTaskLockEntry(instance, taskId)

  if (!entry || isTaskLockExpired(entry, now)) {
    return false
  }

  return Number(entry.user_id) === Number(userId)
}

function hasAnyActiveTaskLock (instance, now = new Date()) {
  const locks = normalizeTaskLocks(instance?.task_locks)

  for (const entry of Object.values(locks)) {
    if (entry?.user_id && !isTaskLockExpired(entry, now)) {
      return true
    }
  }

  if (!instance?.task_lock_user_id) {
    return false
  }

  return !isTaskLockExpired(
    {
      expires_at: instance.task_lock_expires_at
    },
    now
  )
}

function buildTaskLocksPayload (instance, taskId, userId, now = new Date()) {
  const locks = {
    ...normalizeTaskLocks(instance?.task_locks)
  }

  locks[taskId] = {
    user_id: userId,
    locked_at: now.toISOString()
  }

  return locks
}

function removeTaskLockEntry (instance, taskId) {
  const locks = {
    ...normalizeTaskLocks(instance?.task_locks)
  }

  delete locks[taskId]

  return locks
}

function clearAllTaskLocksPayload () {
  return {}
}

function syncLegacyLockColumns (locks = {}) {
  const activeEntries = Object.entries(locks).filter(([, entry]) => entry?.user_id)

  if (!activeEntries.length) {
    return {
      task_lock_user_id: null,
      task_lock_task_id: null,
      task_locked_at: null,
      task_lock_expires_at: null
    }
  }

  const [taskId, entry] = activeEntries[0]

  return {
    task_lock_user_id: entry.user_id,
    task_lock_task_id: taskId,
    task_locked_at: entry.locked_at ? new Date(entry.locked_at) : new Date(),
    task_lock_expires_at: entry.expires_at ? new Date(entry.expires_at) : null
  }
}

module.exports = {
  normalizeTaskLocks,
  getTaskLockEntry,
  isTaskLockExpired,
  isTaskLockedByOther,
  isTaskLockedByUser,
  hasAnyActiveTaskLock,
  buildTaskLocksPayload,
  removeTaskLockEntry,
  clearAllTaskLocksPayload,
  syncLegacyLockColumns
}
