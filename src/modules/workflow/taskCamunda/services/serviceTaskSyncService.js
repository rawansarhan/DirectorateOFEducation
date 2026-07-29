'use strict'

const { Op } = require('sequelize')
const { ProcessInstance, Transaction } = require('../../../../entities')
const { transactionRepository } = require('../../../transaction/public')
const { runServiceTaskActions } = require('./completeTask/completeTaskActionsRunner')
const { syncPendingCompleteRecoveries } = require('./completeRecoveryService')

const LOG_PREFIX = '[WorkflowSync]'

function cloneData (data) {
  return data && typeof data === 'object' ? { ...data } : {}
}

function mergeExecutedTracking (targetData, sourceData) {
  const merged = cloneData(targetData)

  merged._executedServiceTaskInstances = [
    ...new Set([
      ...(merged._executedServiceTaskInstances || []),
      ...(sourceData._executedServiceTaskInstances || [])
    ])
  ]
  merged._executedServiceTasks = [
    ...new Set([
      ...(merged._executedServiceTasks || []),
      ...(sourceData._executedServiceTasks || [])
    ])
  ]
  merged._serviceTaskInstanceTracking = true

  if (sourceData._serviceTaskSyncWatermark) {
    const currentMs = Date.parse(merged._serviceTaskSyncWatermark || '') || 0
    const sourceMs = Date.parse(sourceData._serviceTaskSyncWatermark) || 0
    if (sourceMs >= currentMs) {
      merged._serviceTaskSyncWatermark = sourceData._serviceTaskSyncWatermark
    }
  }

  for (const [key, value] of Object.entries(sourceData || {})) {
    if (key.startsWith('_')) continue
    if (value?.last_activity_instance_id) {
      merged[key] = value
    }
  }

  return merged
}

async function persistServiceTaskResults (transactionId, expectedVersion, nextData) {
  try {
    const updated = await transactionRepository.updateDataOptimistic(
      transactionId,
      nextData,
      expectedVersion
    )
    return {
      ok: true,
      conflict: false,
      version: updated.version,
      transactionData: updated.data || nextData
    }
  } catch (err) {
    if (err.code !== 'VERSION_CONFLICT') {
      throw err
    }

    const fresh = await transactionRepository.findById(transactionId)
    if (!fresh) {
      return { ok: false, conflict: true, reason: 'missing_transaction' }
    }

    const merged = mergeExecutedTracking(fresh.data || {}, nextData)

    try {
      const updated = await transactionRepository.updateDataOptimistic(
        transactionId,
        merged,
        fresh.version
      )
      return {
        ok: true,
        conflict: true,
        version: updated.version,
        transactionData: updated.data || merged
      }
    } catch (retryErr) {
      if (retryErr.code === 'VERSION_CONFLICT') {
        console.warn(
          `${LOG_PREFIX} version conflict persists — tx ${transactionId}, will retry next tick`
        )
        return { ok: false, conflict: true, reason: 'version_conflict' }
      }
      throw retryErr
    }
  }
}

/**
 * يحجز activityInstanceIds في DB قبل إرسال الإشعارات (at-most-once).
 * يُرجع فقط المعرفات التي نجح هذا الـ worker بحجزها فعلياً.
 */
async function claimServiceTaskInstances ({
  transactionId,
  expectedVersion,
  transactionData,
  pendingIds
}) {
  if (!pendingIds.length) {
    return {
      ok: true,
      claimedIds: [],
      version: expectedVersion,
      transactionData
    }
  }

  const fresh = await transactionRepository.findById(transactionId)
  if (!fresh) {
    return { ok: false, claimedIds: [], reason: 'missing_transaction' }
  }

  const already = new Set(fresh.data?._executedServiceTaskInstances || [])
  const toClaim = pendingIds.filter(id => !already.has(id))

  if (!toClaim.length) {
    return {
      ok: true,
      claimedIds: [],
      version: fresh.version,
      transactionData: fresh.data || transactionData,
      reason: 'already_claimed'
    }
  }

  const claimData = mergeExecutedTracking(fresh.data || {}, transactionData)
  claimData._executedServiceTaskInstances = [
    ...new Set([
      ...(claimData._executedServiceTaskInstances || []),
      ...toClaim
    ])
  ]

  const persisted = await persistServiceTaskResults(
    transactionId,
    fresh.version,
    claimData
  )

  if (!persisted.ok) {
    return {
      ok: false,
      claimedIds: [],
      reason: persisted.reason || 'persist_failed'
    }
  }

  // بعد الحفظ (حتى مع conflict merge): احسب ما بقي لنا وغير منفّذ سابقاً
  const after = new Set(
    persisted.transactionData?._executedServiceTaskInstances || []
  )
  const claimedIds = toClaim.filter(id => after.has(id))

  // إذا worker آخر حجز نفس الـ IDs قبلنا عبر merge، لا نعيد التنفيذ
  // claimedIds قد تكون موجودة — لكن إذا كانت أصلاً في already قبل محاولتنا، toClaim كان فارغاً.
  // هنا toClaim كانت جديدة بالنسبة لنا عند بداية الحجز.

  return {
    ok: true,
    claimedIds,
    version: persisted.version,
    transactionData: persisted.transactionData
  }
}

async function syncProcessInstanceServiceTasks (processInstance) {
  const transaction = processInstance.transaction

  if (!transaction?.id || !processInstance.camunda_process_instance_id) {
    return { changed: false }
  }

  let currentVersion = transaction.version
  let currentData = cloneData(transaction.data)

  const task = processInstance.task_lock_task_id
    ? { id: processInstance.task_lock_task_id }
    : null

  const beforeSnapshot = JSON.stringify({
    instances: currentData._executedServiceTaskInstances || [],
    legacy: currentData._executedServiceTasks || [],
    watermark: currentData._serviceTaskSyncWatermark || null,
    tracking: Boolean(currentData._serviceTaskInstanceTracking)
  })

  const nextData = await runServiceTaskActions({
    processInstance,
    transaction,
    transactionData: cloneData(currentData),
    task,
    userId: null,
    source: 'sync',
    claimAndPersist: async (dataWithClaim) => {
      const pendingIds = (dataWithClaim._executedServiceTaskInstances || [])
        .filter(id => !(currentData._executedServiceTaskInstances || []).includes(id))

      const claim = await claimServiceTaskInstances({
        transactionId: transaction.id,
        expectedVersion: currentVersion,
        transactionData: dataWithClaim,
        pendingIds
      })

      if (!claim.ok) {
        return { ok: false, reason: claim.reason, transactionData: currentData }
      }

      currentVersion = claim.version
      currentData = claim.transactionData || dataWithClaim

      // لا إشعارات إذا لم نحجز شيئاً جديداً (worker آخر سبقنا)
      if (!claim.claimedIds.length) {
        return {
          ok: false,
          reason: 'already_claimed',
          transactionData: currentData
        }
      }

      // أبقِ فقط المحجوز من قِبلنا في قائمة التنفيذ عبر تصفية لاحقة في runner
      // نضع علامة بالمحجوز
      currentData.__claimedServiceTaskIds = claim.claimedIds

      return {
        ok: true,
        transactionData: currentData,
        version: currentVersion
      }
    }
  })

  // صفِّ نتائج التنفيذ واحفظها إن تغيّر شيء غير التتبّع وحده
  const afterSnapshot = JSON.stringify({
    instances: nextData._executedServiceTaskInstances || [],
    legacy: nextData._executedServiceTasks || [],
    watermark: nextData._serviceTaskSyncWatermark || null,
    tracking: Boolean(nextData._serviceTaskInstanceTracking)
  })

  delete nextData.__claimedServiceTaskIds

  const changed = beforeSnapshot !== afterSnapshot ||
    Object.keys(nextData).some(key => {
      if (key.startsWith('_')) return false
      return nextData[key]?.last_activity_instance_id &&
        nextData[key]?.last_activity_instance_id !==
          currentData[key]?.last_activity_instance_id
    })

  if (!changed) {
    return { changed: false }
  }

  await persistServiceTaskResults(
    transaction.id,
    currentVersion,
    nextData
  )

  return { changed: true }
}

async function mapPool (items, concurrency, worker) {
  const results = []
  let index = 0

  async function runNext () {
    const current = index
    index += 1

    if (current >= items.length) {
      return
    }

    results[current] = await worker(items[current], current)
    await runNext()
  }

  const starters = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => runNext()
  )

  await Promise.all(starters)
  return results
}

let cursorId = 0

async function syncPendingWorkflowSideEffects ({
  batchSize = 40,
  concurrency = 3,
  recoveryBatchSize = 20,
  recoveryConcurrency = 2
} = {}) {
  const recovery = await syncPendingCompleteRecoveries({
    batchSize: recoveryBatchSize,
    concurrency: recoveryConcurrency
  })

  const serviceTasks = await syncPendingServiceTaskActions({
    batchSize,
    concurrency
  })

  return {
    recovery,
    serviceTasks
  }
}

async function syncPendingServiceTaskActions ({
  batchSize = 40,
  concurrency = 3
} = {}) {
  const where = {
    status: 'running',
    camunda_process_instance_id: {
      [Op.ne]: null
    }
  }

  let rows = await ProcessInstance.findAll({
    where: {
      ...where,
      id: { [Op.gt]: cursorId }
    },
    attributes: [
      'id',
      'camunda_process_instance_id',
      'process_definition_id',
      'transaction_id',
      'task_lock_task_id'
    ],
    include: [
      {
        model: Transaction,
        as: 'transaction',
        required: true,
        attributes: ['id', 'data', 'version', 'user_id', 'status'],
        where: {
          status: {
            [Op.in]: ['submitted', 'in_progress']
          }
        }
      }
    ],
    order: [['id', 'ASC']],
    limit: batchSize
  })

  if (!rows.length && cursorId > 0) {
    cursorId = 0
    rows = await ProcessInstance.findAll({
      where,
      attributes: [
        'id',
        'camunda_process_instance_id',
        'process_definition_id',
        'transaction_id',
        'task_lock_task_id'
      ],
      include: [
        {
          model: Transaction,
          as: 'transaction',
          required: true,
          attributes: ['id', 'data', 'version', 'user_id', 'status'],
          where: {
            status: {
              [Op.in]: ['submitted', 'in_progress']
            }
          }
        }
      ],
      order: [['id', 'ASC']],
      limit: batchSize
    })
  }

  if (!rows.length) {
    return { scanned: 0, changed: 0, errors: 0 }
  }

  cursorId = rows[rows.length - 1].id

  let changed = 0
  let errors = 0

  await mapPool(rows, concurrency, async (processInstance) => {
    try {
      const result = await syncProcessInstanceServiceTasks(processInstance)
      if (result.changed) {
        changed += 1
      }
    } catch (err) {
      errors += 1
      console.error(
        `${LOG_PREFIX} failed — processInstance ${processInstance.id}:`,
        err.message
      )
    }
  })

  return {
    scanned: rows.length,
    changed,
    errors,
    cursorId
  }
}

module.exports = {
  syncPendingWorkflowSideEffects,
  syncPendingServiceTaskActions,
  syncProcessInstanceServiceTasks
}
