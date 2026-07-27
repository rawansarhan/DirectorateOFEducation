'use strict'

const { COMPLETE_RECOVERY_MAX_ATTEMPTS } = require('../../../../../core/config/env')

const MAX_RECOVERY_ATTEMPTS = COMPLETE_RECOVERY_MAX_ATTEMPTS

function initCompleteSideEffects ({
  taskId,
  stageCode,
  userId,
  isReject = false,
  isAutoComplete = false,
  overrideTarget = null
} = {}) {
  const now = new Date().toISOString()

  return {
    status: 'pending',
    task_id: taskId || null,
    stage_code: stageCode || null,
    user_id: userId ?? null,
    is_reject: Boolean(isReject),
    is_auto_complete: Boolean(isAutoComplete),
    override_target: overrideTarget || null,
    local_saved: false,
    camunda_done: false,
    service_tasks_done: false,
    workflow_synced: false,
    lock_released: false,
    workflow_status: null,
    next_stage_id: null,
    started_at: now,
    updated_at: now,
    completed_at: null,
    last_error: null,
    recovery_attempts: 0
  }
}

function attachCompleteSideEffects (transactionData, sideEffects) {
  return {
    ...(transactionData || {}),
    _complete_side_effects: {
      ...(sideEffects || {})
    }
  }
}

function markCompleteSideEffectStep (sideEffects, step, extra = {}) {
  const next = {
    ...(sideEffects || {}),
    ...extra,
    updated_at: new Date().toISOString()
  }

  if (step === 'local_saved') next.local_saved = true
  if (step === 'camunda_done') next.camunda_done = true
  if (step === 'service_tasks_done') next.service_tasks_done = true
  if (step === 'workflow_synced') next.workflow_synced = true
  if (step === 'lock_released') next.lock_released = true

  return next
}

function markCompleteSideEffectsDone (sideEffects, extra = {}) {
  const now = new Date().toISOString()

  return {
    ...(sideEffects || {}),
    ...extra,
    status: 'completed',
    local_saved: true,
    camunda_done: true,
    service_tasks_done: true,
    workflow_synced: true,
    lock_released: true,
    last_error: null,
    updated_at: now,
    completed_at: now
  }
}

function markCompleteSideEffectsFailed (sideEffects, error) {
  return {
    ...(sideEffects || {}),
    status: 'failed',
    last_error: error?.message || String(error || 'unknown'),
    updated_at: new Date().toISOString()
  }
}

function getCompleteSideEffects (transactionData) {
  const state = transactionData?._complete_side_effects

  if (!state || typeof state !== 'object') {
    return null
  }

  return state
}

function needsCompleteRecovery (sideEffects) {
  if (!sideEffects) return false
  if (sideEffects.status === 'completed') return false
  if (!sideEffects.camunda_done) return false
  if (sideEffects.lock_released) return false
  if ((sideEffects.recovery_attempts || 0) >= MAX_RECOVERY_ATTEMPTS) return false

  return true
}

function getNextCompleteRecoveryStep (sideEffects) {
  if (!needsCompleteRecovery(sideEffects)) {
    return null
  }

  if (!sideEffects.is_reject && !sideEffects.service_tasks_done) {
    return 'service_tasks'
  }

  if (!sideEffects.workflow_synced) {
    return 'workflow_sync'
  }

  if (!sideEffects.lock_released) {
    return 'lock_release'
  }

  return null
}

function incrementRecoveryAttempt (sideEffects) {
  return {
    ...(sideEffects || {}),
    recovery_attempts: Number(sideEffects?.recovery_attempts || 0) + 1,
    updated_at: new Date().toISOString()
  }
}

module.exports = {
  MAX_RECOVERY_ATTEMPTS,
  initCompleteSideEffects,
  attachCompleteSideEffects,
  markCompleteSideEffectStep,
  markCompleteSideEffectsDone,
  markCompleteSideEffectsFailed,
  getCompleteSideEffects,
  needsCompleteRecovery,
  getNextCompleteRecoveryStep,
  incrementRecoveryAttempt
}
