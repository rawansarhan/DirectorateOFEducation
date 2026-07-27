'use strict'

const {
  getTaskLockEntry,
  isTaskLockExpired
} = require('./processInstanceTaskLocks')

function isLockExpired (processInstance, taskId, now = new Date()) {
  const entry = getTaskLockEntry(processInstance, taskId)
  return isTaskLockExpired(entry, now)
}

function isLockedByUser (processInstance, taskId, userId) {
  const entry = getTaskLockEntry(processInstance, taskId)

  if (!entry?.user_id || isTaskLockExpired(entry)) {
    return false
  }

  return Number(entry.user_id) === Number(userId)
}

function resolveEmployeeTaskStatus ({
  transaction,
  processInstance,
  activeTask,
  userId
}) {
  const txStatus = transaction?.status

  if (txStatus === 'completed') {
    return {
      status: 'completed',
      status_label: 'منجز'
    }
  }

  if (txStatus === 'rejected') {
    return {
      status: 'rejected',
      status_label: 'مرفوض'
    }
  }

  const taskId = activeTask?.id

  if (taskId && isLockedByUser(processInstance, taskId, userId)) {
    return {
      status: 'in_progress',
      status_label: 'قيد التنفيذ'
    }
  }

  if (taskId) {
    const entry = getTaskLockEntry(processInstance, taskId)

    if (entry?.user_id && !isTaskLockExpired(entry)) {
      return {
        status: 'in_progress',
        status_label: 'قيد التنفيذ'
      }
    }
  }

  return {
    status: 'pending_pickup',
    status_label: 'بانتظار الاستلام'
  }
}

function calculateProgressPercent (completedStages, totalStages) {
  if (!totalStages || totalStages <= 0) {
    return 0
  }

  const safeCompleted = Math.max(0, Math.min(completedStages, totalStages))

  return Math.round((safeCompleted / totalStages) * 100)
}

function buildApplicantName (transaction, user) {
  const fromTransaction = [
    transaction?.first_name,
    transaction?.father_name,
    transaction?.last_name
  ]
    .filter(Boolean)
    .join(' ')
    .trim()

  if (fromTransaction) {
    return fromTransaction
  }

  const fromUser = [
    user?.first_name,
    user?.father_name,
    user?.last_name
  ]
    .filter(Boolean)
    .join(' ')
    .trim()

  if (fromUser) {
    return fromUser
  }

  return user?.userName || null
}

function resolveDepartmentName (currentStage) {
  const assignment = currentStage?.stage_assignments?.[0]
  const orgDeptRole = assignment?.organization_department_role

  return (
    orgDeptRole?.department?.name ||
    orgDeptRole?.organization?.name ||
    currentStage?.name ||
    null
  )
}

module.exports = {
  resolveEmployeeTaskStatus,
  calculateProgressPercent,
  buildApplicantName,
  resolveDepartmentName,
  isLockedByUser,
  isLockExpired
}
