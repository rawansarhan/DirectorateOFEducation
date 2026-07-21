'use strict'

const employeeTaskRepository = require('../../repositories/employeeTaskRepository')
const { releaseTaskLock } = require('../taskLockService')
const {
  invalidateEmployeeTasksForUser,
  deleteKeysByPattern,
  invalidateEmployeeTaskStats,
  invalidateTaskDetails
} = require('../../../../../core/cache/apiCacheService')
const { logStep } = require('./completeTaskHelpers')

async function releaseLockAndInvalidateCaches ({
  isAutoComplete,
  processInstance,
  task,
  userId,
  stage,
  nextStageId = null,
  workflowStatus,
  isReject = false
}) {
  if (!isAutoComplete) {
    logStep('PHASE_18_RELEASE_TASK_LOCK', { taskId: task.id, userId })

    await releaseTaskLock({
      processInstanceId: processInstance.id,
      taskId: task.id,
      userId
    })

    logStep('TASK_LOCK_RELEASED', { taskId: task.id, userId })
  }

  logStep('PHASE_19_INVALIDATE_CACHES', { userId, workflowStatus })

  const stageIdsToInvalidate = [stage.id, nextStageId].filter(Boolean)
  const affectedUserIds = await employeeTaskRepository.getUserIdsForStageIds(
    stageIdsToInvalidate
  )
  const userIdsToInvalidate = new Set([userId, ...affectedUserIds])

  for (const affectedUserId of userIdsToInvalidate) {
    invalidateEmployeeTasksForUser(affectedUserId).catch(() => {})
  }

  invalidateEmployeeTaskStats().catch(() => {})
  invalidateTaskDetails(task.id).catch(() => {})

  if (workflowStatus === 'completed' || isReject) {
    deleteKeysByPattern('employee-tasks:*:depts:*').catch(() => {})
  }

  logStep('CORE_DONE', {
    taskId: task.id,
    transactionId: processInstance.transaction_id,
    stageCode: stage.code,
    workflowStatus
  })
}

module.exports = {
  releaseLockAndInvalidateCaches
}
