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
    merged._serviceTaskSyncWatermark = sourceData._serviceTaskSyncWatermark
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
    await transactionRepository.updateDataOptimistic(
      transactionId,
      nextData,
      expectedVersion
    )
    return { ok: true, conflict: false }
  } catch (err) {
    if (err.code !== 'VERSION_CONFLICT') {
      throw err
    }

    // سباق مع completeTask: ادمج التتبّع فقط حتى لا تُعاد الإشعارات
    const fresh = await transactionRepository.findById(transactionId)
    if (!fresh) {
      return { ok: false, conflict: true }
    }

    const merged = mergeExecutedTracking(fresh.data || {}, nextData)

    try {
      await transactionRepository.updateDataOptimistic(
        transactionId,
        merged,
        fresh.version
      )
      return { ok: true, conflict: true }
    } catch (retryErr) {
      if (retryErr.code === 'VERSION_CONFLICT') {
        console.warn(
          `${LOG_PREFIX} version conflict persists — tx ${transactionId}, will retry next tick`
        )
        return { ok: false, conflict: true }
      }
      throw retryErr
    }
  }
}

async function syncProcessInstanceServiceTasks (processInstance) {
  const transaction = processInstance.transaction

  if (!transaction?.id || !processInstance.camunda_process_instance_id) {
    return { changed: false }
  }

  const beforeData = cloneData(transaction.data)
  const beforeInstances = JSON.stringify(
    beforeData._executedServiceTaskInstances || []
  )
  const beforeLegacy = JSON.stringify(beforeData._executedServiceTasks || [])
  const beforeWatermark = beforeData._serviceTaskSyncWatermark || null
  const beforeTracking = Boolean(beforeData._serviceTaskInstanceTracking)

  const task = processInstance.task_lock_task_id
    ? { id: processInstance.task_lock_task_id }
    : null

  const nextData = await runServiceTaskActions({
    processInstance,
    transaction,
    transactionData: cloneData(transaction.data),
    task,
    userId: null,
    source: 'sync'
  })

  const changed =
    beforeInstances !==
      JSON.stringify(nextData._executedServiceTaskInstances || []) ||
    beforeLegacy !== JSON.stringify(nextData._executedServiceTasks || []) ||
    beforeTracking !== Boolean(nextData._serviceTaskInstanceTracking) ||
    beforeWatermark !== (nextData._serviceTaskSyncWatermark || null)

  if (!changed) {
    return { changed: false }
  }

  await persistServiceTaskResults(
    transaction.id,
    transaction.version,
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

/**
 * Cursor دائري في الذاكرة — يوزّع الحمل على عدة دقائق بدل فحص الكل دفعة واحدة.
 */
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
