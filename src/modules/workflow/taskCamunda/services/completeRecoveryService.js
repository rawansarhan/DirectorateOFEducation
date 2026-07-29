'use strict'

const { Op } = require('sequelize')
const { Transaction, ProcessInstance } = require('../../../../entities')
const { transactionRepository } = require('../../../transaction/public')
const processInstanceRepository = require('../repositories/processInstanceRepository')
const stageRepository = require('../../processDefinition/repositories/stageRepository')
const camundaClient = require('../../../../core/shared/clients/camunda/camundaClient')
const { runServiceTaskActions } = require('./completeTask/completeTaskActionsRunner')
const { runApproveFlow } = require('./completeTask/completeTaskApproveFlow')
const { runRejectFlow } = require('./completeTask/completeTaskRejectFlow')
const { releaseLockAndInvalidateCaches } = require('./completeTask/completeTaskPostComplete')
const {
  attachCompleteSideEffects,
  markCompleteSideEffectStep,
  markCompleteSideEffectsDone,
  markCompleteSideEffectsFailed,
  getCompleteSideEffects,
  needsCompleteRecovery,
  getNextCompleteRecoveryStep,
  incrementRecoveryAttempt
} = require('./completeTask/completeSideEffectsState')

const LOG_PREFIX = '[CompleteRecovery]'

function cloneData (data) {
  return data && typeof data === 'object' ? { ...data } : {}
}
// هذه الدالة تستخدم لحفظ حالة الاستراجاع للمعاملة 
async function persistRecoveryState ({
  transactionId,
  expectedVersion,
  transactionData,
  sideEffects
}) {
  const payload = attachCompleteSideEffects(transactionData, sideEffects)
//هذه الدالة تستخدم لتحديث البيانات  بشكل امتثالي ولمنع التعديلا المتعددة على البيانات 
  const updated = await transactionRepository.updateDataOptimistic(
    transactionId,
    payload,
    expectedVersion
  )

  return {
    version: updated.version,
    transactionData: updated.data || payload
  }
}
//هذه الدالة تستخدم للتحقق من حالة المعاملة التي تم انشائها في camunda 
async function isWorkflowAlreadySynced ({
  processInstance,
  transaction,
  sideEffects
}) {
  if (sideEffects.is_reject) {
    return (
      transaction.status === 'rejected' &&
      processInstance.status === 'cancelled'
    )
  }

  const nextTasks = await camundaClient.getActiveTasks(
    processInstance.camunda_process_instance_id
  )

  if (!nextTasks.length) {
    return (
      transaction.status === 'completed' &&
      processInstance.status === 'completed'
    )
  }

  const nextStageIds = []

  for (const nextTask of nextTasks) {
    const nextStage = await stageRepository.findByCodeAndProcess(
      processInstance.process_definition_id,
      nextTask.taskDefinitionKey
    )

    if (nextStage?.id) {
      nextStageIds.push(nextStage.id)
    }
  }

  if (!nextStageIds.length) {
    return false
  }

  return nextStageIds.includes(processInstance.current_stage_id)
}
//هذه المعاملة تستخدم لاستكمال المعاملة التي تم انشائها في camunda 
async function resumeCompleteSideEffectsForTransaction (transactionRow) {
  let transaction = transactionRow
  let sideEffects = getCompleteSideEffects(transaction.data)

  if (!needsCompleteRecovery(sideEffects)) {
    return { recovered: false, reason: 'not_needed' }
  }

  const processInstance = await ProcessInstance.findOne({
    where: { transaction_id: transaction.id }
  })

  if (!processInstance?.camunda_process_instance_id) {
    return { recovered: false, reason: 'missing_process_instance' }
  }

  sideEffects = incrementRecoveryAttempt(sideEffects)

  let transactionData = cloneData(transaction.data)
  let currentVersion = transaction.version
  let workflowStatus = sideEffects.workflow_status || 'running'
  let nextStageId = sideEffects.next_stage_id ?? null

  const task = sideEffects.task_id ? { id: sideEffects.task_id } : null
  const stage = sideEffects.stage_code
    ? await stageRepository.findByCodeAndProcess(
      processInstance.process_definition_id,
      sideEffects.stage_code
    )
    : null

  if (!stage) {
    sideEffects = markCompleteSideEffectsFailed(
      sideEffects,
      new Error('stage_code missing for recovery')
    )
    await persistRecoveryState({
      transactionId: transaction.id,
      expectedVersion: currentVersion,
      transactionData,
      sideEffects
    })
    return { recovered: false, reason: 'missing_stage' }
  }

  const nextStep = getNextCompleteRecoveryStep(sideEffects)

  if (!nextStep) {
    return { recovered: false, reason: 'no_step' }
  }

  console.log(
    `${LOG_PREFIX} tx=${transaction.id} step=${nextStep} attempt=${sideEffects.recovery_attempts}`
  )

  try {
    if (nextStep === 'service_tasks') {
      let recoveryClaimVersion = currentVersion
      const idsBeforeServiceTasks = new Set(
        transactionData._executedServiceTaskInstances || []
      )

      transactionData = await runServiceTaskActions({
        processInstance,
        transaction,
        transactionData,
        task,
        userId: sideEffects.user_id,
        source: 'recovery',
        claimAndPersist: async (dataWithClaim) => {
          const claimedIds = (dataWithClaim._executedServiceTaskInstances || [])
            .filter(id => !idsBeforeServiceTasks.has(id))

          const claimed = await persistRecoveryState({
            transactionId: transaction.id,
            expectedVersion: recoveryClaimVersion,
            transactionData: dataWithClaim,
            sideEffects
          })

          recoveryClaimVersion = claimed.version
          currentVersion = claimed.version

          claimed.transactionData.__claimedServiceTaskIds = claimedIds

          return {
            ok: true,
            transactionData: claimed.transactionData,
            version: claimed.version
          }
        }
      })

      sideEffects = markCompleteSideEffectStep(sideEffects, 'service_tasks_done')
      transactionData = attachCompleteSideEffects(transactionData, sideEffects)

      const saved = await persistRecoveryState({
        transactionId: transaction.id,
        expectedVersion: currentVersion,
        transactionData,
        sideEffects
      })

      currentVersion = saved.version
      transactionData = saved.transactionData
    }

    if (getNextCompleteRecoveryStep(sideEffects) === 'workflow_sync') {
      const alreadySynced = await isWorkflowAlreadySynced({
        processInstance,
        transaction,
        sideEffects
      })

      if (!alreadySynced) {
        const sequelize = processInstanceRepository.getSequelize()

        if (sideEffects.is_reject) {
          const rejectResult = await runRejectFlow({
            processInstance,
            transaction,
            transactionData,
            currentVersion,
            stage,
            stageSnapshot: transactionData[stage.code] || {},
            userId: sideEffects.user_id,
            sequelize
          })

          workflowStatus = rejectResult.workflowStatus
          nextStageId = rejectResult.nextStageId
          currentVersion = rejectResult.currentVersion
          transactionData = rejectResult.transactionData
        } else {
          const approveResult = await runApproveFlow({
            processInstance,
            transaction,
            transactionData,
            currentVersion,
            overrideTarget: sideEffects.override_target || null,
            userId: sideEffects.user_id,
            sequelize
          })

          workflowStatus = approveResult.workflowStatus
          nextStageId = approveResult.nextStageId
          currentVersion = approveResult.currentVersion
          transactionData = approveResult.transactionData
        }
      } else {
        workflowStatus = sideEffects.is_reject ? 'rejected' : (
          transaction.status === 'completed' ? 'completed' : 'running'
        )
      }

      sideEffects = markCompleteSideEffectStep(sideEffects, 'workflow_synced', {
        workflow_status: workflowStatus,
        next_stage_id: nextStageId
      })
      transactionData = attachCompleteSideEffects(transactionData, sideEffects)

      const saved = await persistRecoveryState({
        transactionId: transaction.id,
        expectedVersion: currentVersion,
        transactionData,
        sideEffects
      })

      currentVersion = saved.version
      transactionData = saved.transactionData
    }
//
    if (getNextCompleteRecoveryStep(sideEffects) === 'lock_release') {
      await releaseLockAndInvalidateCaches({
        isAutoComplete: sideEffects.is_auto_complete,
        processInstance,
        task,
        userId: sideEffects.user_id,
        stage,
        nextStageId,
        workflowStatus,
        isReject: sideEffects.is_reject
      })

      sideEffects = markCompleteSideEffectsDone(sideEffects, {
        workflow_status: workflowStatus,
        next_stage_id: nextStageId
      })
      transactionData = attachCompleteSideEffects(transactionData, sideEffects)

      await persistRecoveryState({
        transactionId: transaction.id,
        expectedVersion: currentVersion,
        transactionData,
        sideEffects
      })
    }

    return { recovered: true, step: nextStep, transactionId: transaction.id }
  } catch (err) {
    sideEffects = markCompleteSideEffectsFailed(sideEffects, err)
    transactionData = attachCompleteSideEffects(transactionData, sideEffects)

    try {
      await persistRecoveryState({
        transactionId: transaction.id,
        expectedVersion: currentVersion,
        transactionData,
        sideEffects
      })
    } catch (persistErr) {
      console.error(
        `${LOG_PREFIX} failed to persist recovery error — tx ${transaction.id}:`,
        persistErr.message
      )
    }

    throw err
  }
}

async function findTransactionsNeedingCompleteRecovery ({ batchSize = 20 } = {}) {
  const sequelize = Transaction.sequelize

  return Transaction.findAll({
    where: {
      status: {
        [Op.in]: ['submitted', 'in_progress']
      },
      [Op.and]: [
        sequelize.literal(`(data->'_complete_side_effects'->>'camunda_done') = 'true'`),
        sequelize.literal(`(data->'_complete_side_effects'->>'lock_released') = 'false'`),
        sequelize.literal(
          `(data->'_complete_side_effects'->>'status') IN ('pending', 'failed')`
        )
      ]
    },
    attributes: ['id', 'data', 'version', 'status', 'user_id'],
    order: [['updated_at', 'ASC']],
    limit: batchSize
  })
}

async function syncPendingCompleteRecoveries ({
  batchSize = 20,
  concurrency = 2
} = {}) {
  const rows = await findTransactionsNeedingCompleteRecovery({ batchSize })

  if (!rows.length) {
    return { scanned: 0, recovered: 0, errors: 0 }
  }

  let recovered = 0
  let errors = 0
  let index = 0

  async function runWorker () {
    while (index < rows.length) {
      const current = index
      index += 1
      const row = rows[current]

      try {
        const result = await resumeCompleteSideEffectsForTransaction(row)
        if (result.recovered) {
          recovered += 1
        }
      } catch (err) {
        errors += 1
        console.error(
          `${LOG_PREFIX} tx ${row.id} failed:`,
          err.message
        )
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, rows.length) },
    () => runWorker()
  )

  await Promise.all(workers)

  return {
    scanned: rows.length,
    recovered,
    errors
  }
}

module.exports = {
  resumeCompleteSideEffectsForTransaction,
  findTransactionsNeedingCompleteRecovery,
  syncPendingCompleteRecoveries
}
