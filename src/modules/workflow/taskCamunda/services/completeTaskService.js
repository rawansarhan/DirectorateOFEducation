'use strict'

/**
 * =============================================================================
 * completeTaskService — نقطة الدخول العامة لإكمال مهمة Camunda
 * =============================================================================
 *
 * المنطق التفصيلي مُقسَّم تحت:
 *   services/completeTask/
 */

const { v4: uuidv4 } = require('uuid')
const securityGuardService = require('../../../../core/security/securityGuardService')
const operationGuardService = require('../../../../core/security/operationGuardService')
const {
  buildAutoCompleteAuthPayload,
  buildCompleteTaskGuardKey,
  logStep
} = require('./completeTask/completeTaskHelpers')
const { completeTaskCore } = require('./completeTask/completeTaskCore')

async function completeTask ({
  taskId,
  userId,
  payload,
  clientMeta = {},
  isAutoComplete = false,
  requireSignature = false,
  dbTransaction = null
}) {
  logStep('START', {
    taskId,
    userId,
    isAutoComplete,
    requireSignature,
    decision: payload?.decision || payload?.variables?.decision || ''
  })

  await securityGuardService.assertAccountNotLocked(userId)
  logStep('SECURITY_OK', { userId })

  const guardKey = !isAutoComplete ? buildCompleteTaskGuardKey(taskId) : null
  const issuedIdempotencyKey = !isAutoComplete ? uuidv4() : null
  const idempotencyKey = guardKey

  let guardContext = null

  if (!isAutoComplete && idempotencyKey) {
    const replay = operationGuardService.getReplay({
      scope: 'complete_task',
      userId,
      idempotencyKey
    })

    if (replay) {
      logStep('IDEMPOTENT_REPLAY_HIT', { taskId, userId })
      return replay
    }
  }

  try {
    const result = await completeTaskCore({
      taskId,
      userId,
      payload,
      clientMeta,
      isAutoComplete,
      idempotencyKey,
      requireSignature,
      issuedIdempotencyKey,
      dbTransaction,
      async acquireOperationGuard () {
        if (isAutoComplete) {
          return null
        }

        const guard = operationGuardService.begin({
          scope: 'complete_task',
          userId,
          resourceId: taskId,
          idempotencyKey
        })

        if (guard.replay) {
          const error = new Error('Idempotent replay')
          error.code = 'IDEMPOTENT_REPLAY'
          error.result = guard.result
          throw error
        }

        guardContext = guard.context
        logStep('GUARD_ACQUIRED', { taskId, userId })
        return guardContext
      }
    })

    if (guardContext) {
      logStep('GUARD_COMMIT', { taskId, userId })
      return operationGuardService.commit(guardContext, result)
    }

    logStep('DONE', {
      taskId,
      workflowStatus: result?.data?.workflow_status || ''
    })

    return result
  } catch (error) {
    if (error.code === 'IDEMPOTENT_REPLAY') {
      logStep('IDEMPOTENT_REPLAY_THROW', { taskId, userId })
      return error.result
    }

    logStep('FAILED', {
      taskId,
      userId,
      error: error.message,
      code: error.code || ''
    })

    operationGuardService.release(guardContext)
    throw error
  }
}

module.exports = {
  completeTask,
  buildAutoCompleteAuthPayload
}
