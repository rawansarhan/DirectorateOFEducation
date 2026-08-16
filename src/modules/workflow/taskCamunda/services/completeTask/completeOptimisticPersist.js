'use strict'

/**
 * حفظ تفاؤلي لمسار complete/recovery:
 * عند VERSION_CONFLICT (كاتب موازٍ / تاسك آخر / sync)
 * نعيد القراءة وندمج ثم نعيد المحاولة بدل إسقاط الخطأ بعد Camunda.
 */

const {
  transactionRepository
} = require('../../../../transaction/public')

const DEFAULT_MAX_RETRIES = 3

function asObject (value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {}
}

function uniqueList (...lists) {
  return [...new Set(lists.flat().filter(Boolean))]
}

function mergeCompleteSideEffects (freshEffects = {}, incomingEffects = {}) {
  const a = asObject(freshEffects)
  const b = asObject(incomingEffects)

  const merged = {
    ...a,
    ...b,
    local_saved: Boolean(a.local_saved || b.local_saved),
    camunda_done: Boolean(a.camunda_done || b.camunda_done),
    service_tasks_done: Boolean(a.service_tasks_done || b.service_tasks_done),
    workflow_synced: Boolean(a.workflow_synced || b.workflow_synced),
    lock_released: Boolean(a.lock_released || b.lock_released),
    recovery_attempts: Math.max(
      Number(a.recovery_attempts || 0),
      Number(b.recovery_attempts || 0)
    )
  }

  if (merged.lock_released && merged.camunda_done) {
    merged.status = 'completed'
    merged.last_error = null
    merged.completed_at =
      b.completed_at || a.completed_at || new Date().toISOString()
  } else if (b.status === 'failed' || a.status === 'failed') {
    merged.status = 'failed'
    merged.last_error = b.last_error || a.last_error || null
  } else {
    merged.status = b.status || a.status || 'pending'
  }

  merged.updated_at = new Date().toISOString()
  return merged
}

/**
 * يحافظ على كتابات الآخرين ويفضّل لقطة المرحلة / side-effects الواردة.
 */
function mergeCompleteTransactionData (freshData = {}, incomingData = {}) {
  const fresh = asObject(freshData)
  const incoming = asObject(incomingData)
  const merged = { ...fresh }

  for (const [key, value] of Object.entries(incoming)) {
    if (key.startsWith('_')) {
      continue
    }
    merged[key] = value
  }

  merged._complete_side_effects = mergeCompleteSideEffects(
    fresh._complete_side_effects,
    incoming._complete_side_effects
  )

  merged._executedServiceTaskInstances = uniqueList(
    fresh._executedServiceTaskInstances,
    incoming._executedServiceTaskInstances
  )
  merged._executedServiceTasks = uniqueList(
    fresh._executedServiceTasks,
    incoming._executedServiceTasks
  )

  if (incoming._serviceTaskInstanceTracking || fresh._serviceTaskInstanceTracking) {
    merged._serviceTaskInstanceTracking = true
  }

  const freshWm = Date.parse(fresh._serviceTaskSyncWatermark || '') || 0
  const incomingWm = Date.parse(incoming._serviceTaskSyncWatermark || '') || 0
  if (incomingWm >= freshWm && incoming._serviceTaskSyncWatermark) {
    merged._serviceTaskSyncWatermark = incoming._serviceTaskSyncWatermark
  } else if (fresh._serviceTaskSyncWatermark) {
    merged._serviceTaskSyncWatermark = fresh._serviceTaskSyncWatermark
  }

  const freshSigs = Array.isArray(fresh.digital_signatures)
    ? fresh.digital_signatures
    : []
  const incomingSigs = Array.isArray(incoming.digital_signatures)
    ? incoming.digital_signatures
    : []

  if (freshSigs.length || incomingSigs.length) {
    const byId = new Map()
    for (const sig of [...freshSigs, ...incomingSigs]) {
      const id = sig?.digital_signature_id || sig?.id || null
      if (id == null) continue
      byId.set(String(id), sig)
    }
    merged.digital_signatures = [...byId.values()]
  }

  return merged
}

async function persistOptimisticWithConflictRetry ({
  transactionId,
  expectedVersion,
  transactionData,
  dbTransaction = null,
  maxRetries = DEFAULT_MAX_RETRIES
} = {}) {
  let version = expectedVersion
  let payload = transactionData
  let conflictRetried = false

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const updated = await transactionRepository.updateDataOptimistic(
        transactionId,
        payload,
        version,
        dbTransaction
      )

      return {
        version: updated.version,
        transactionData: updated.data || payload,
        conflictRetried
      }
    } catch (err) {
      if (err.code !== 'VERSION_CONFLICT' || attempt === maxRetries) {
        throw err
      }

      conflictRetried = true

      const fresh = await transactionRepository.findById(
        transactionId,
        dbTransaction
      )

      if (!fresh) {
        throw err
      }

      version = fresh.version
      payload = mergeCompleteTransactionData(fresh.data || {}, payload)
    }
  }

  const error = new Error(
    'تم تعديل المعاملة من موظف آخر. أعد تحميل التفاصيل وحاول مجدداً.'
  )
  error.code = 'VERSION_CONFLICT'
  throw error
}

module.exports = {
  mergeCompleteSideEffects,
  mergeCompleteTransactionData,
  persistOptimisticWithConflictRetry
}
