'use strict'

const cron = require('node-cron')
const {
  SERVICE_TASK_SYNC_ENABLED,
  SERVICE_TASK_SYNC_CRON,
  SERVICE_TASK_SYNC_BATCH_SIZE,
  SERVICE_TASK_SYNC_CONCURRENCY,
  COMPLETE_RECOVERY_BATCH_SIZE,
  COMPLETE_RECOVERY_CONCURRENCY
} = require('../config/env')
const {
  syncPendingWorkflowSideEffects
} = require('../../modules/workflow/taskCamunda/services/serviceTaskSyncService')

const LOG_PREFIX = '[WorkflowSyncJob]'

let isRunning = false

async function tick () {
  if (!SERVICE_TASK_SYNC_ENABLED) {
    return
  }

  if (isRunning) {
    return
  }

  isRunning = true

  try {
    const result = await syncPendingWorkflowSideEffects({
      batchSize: SERVICE_TASK_SYNC_BATCH_SIZE,
      concurrency: SERVICE_TASK_SYNC_CONCURRENCY,
      recoveryBatchSize: COMPLETE_RECOVERY_BATCH_SIZE,
      recoveryConcurrency: COMPLETE_RECOVERY_CONCURRENCY
    })

    const { recovery, serviceTasks } = result

    if (recovery.scanned > 0 || serviceTasks.scanned > 0) {
      console.log(
        `${LOG_PREFIX} recovery scanned=${recovery.scanned} recovered=${recovery.recovered} errors=${recovery.errors} | serviceTasks scanned=${serviceTasks.scanned} changed=${serviceTasks.changed} errors=${serviceTasks.errors} cursor=${serviceTasks.cursorId}`
      )
    }
  } catch (err) {
    console.error(`${LOG_PREFIX} error:`, err.message)
  } finally {
    isRunning = false
  }
}

function startServiceTaskSyncJob () {
  if (!SERVICE_TASK_SYNC_ENABLED) {
    console.log(`${LOG_PREFIX} disabled`)
    return
  }

  if (!cron.validate(SERVICE_TASK_SYNC_CRON)) {
    console.error(
      `${LOG_PREFIX} invalid cron "${SERVICE_TASK_SYNC_CRON}" — job not started`
    )
    return
  }

  cron.schedule(SERVICE_TASK_SYNC_CRON, () => {
    tick()
  })

  console.log(
    `${LOG_PREFIX} started — cron=${SERVICE_TASK_SYNC_CRON} batch=${SERVICE_TASK_SYNC_BATCH_SIZE} concurrency=${SERVICE_TASK_SYNC_CONCURRENCY}`
  )
}

module.exports = {
  startServiceTaskSyncJob,
  tick
}
