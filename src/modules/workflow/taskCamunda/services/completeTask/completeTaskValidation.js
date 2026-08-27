'use strict'

const stageConfigRepository = require('../../../stageConfig/repositories/stageConfigRepository')
const {
  validateAndNormalizeUnifiedFormPayload
} = require('../../../services/unifiedFormPayloadService')
const {
  requiresDigitalSignature,
  verifySignatureForComplete,
  computeSigningStageDataHash
} = require('../transactionSigningService')
const { normalizeSigningDecision } = require('../../../schemas/signingChallengeSchema')
const {
  validateCompleteTaskAssignmentsForStage
} = require('../../../schemas/completeTaskSchema')
const {
  resolveDestinationOverrideFromComplete
} = require('../taskAssignmentRoutingService')
const {
  buildAutoCompleteAuthPayload,
  logStep
} = require('./completeTaskHelpers')
const {
  assertUpcomingSelfCardCreateUniqueness
} = require('../../../services/selfCardCreatePreValidation')

async function resolveDecisionAndValidateComplete ({
  payload,
  stage,
  transaction,
  task,
  userId,
  clientMeta = {},
  isAutoComplete = false,
  requireSignature = false,
  idempotencyKey = null,
  acquireOperationGuard = null,
  processDefinitionId = null
}) {
  logStep('PHASE_6_RESOLVE_DECISION')

  const signingDecision = payload.decision
    ? normalizeSigningDecision(payload.decision)
    : null
  const isReject = signingDecision === 'reject'

  const stageConfig = await stageConfigRepository.findByStageId(stage.id)
  const needsSignature =
    !isAutoComplete &&
    (requireSignature ||
      requiresDigitalSignature(
        stage,
        payload,
        stageConfig,
        { isAutoComplete }
      ))

  logStep('DECISION_RESOLVED', {
    decision: signingDecision || payload.decision || 'none',
    isReject,
    needsSignature
  })

  let normalizedPayload = payload

  if (
    isAutoComplete &&
    stage?.auth_type === 'AUTH' &&
    !Array.isArray(payload?.widgets)
  ) {
    const authPayload = await buildAutoCompleteAuthPayload(transaction.data || {})

    if (!authPayload.widgets.length) {
      const error = new Error(
        'بيانات التقديم غير موجودة على المعاملة — أعد submit مع widgets[] قبل بدء workflow'
      )
      error.code = 'VALIDATION_ERROR'
      throw error
    }

    logStep('PHASE_6_AUTH_AUTO_PAYLOAD', {
      widgetCount: authPayload.widgets.length,
      templateCount: authPayload.templates.length
    })

    normalizedPayload = authPayload
  }

  if (stageConfig?.config_json) {
    try {
      normalizedPayload = await validateAndNormalizeUnifiedFormPayload(
        normalizedPayload,
        stageConfig.config_json,
        {
          mode: 'complete',
          stageName: stage.name
        }
      )
    } catch (validationError) {
      const error = new Error(validationError.message)
      error.code = 'VALIDATION_ERROR'
      throw error
    }
  }

  if (isReject && !String(normalizedPayload.note ?? payload.note ?? '').trim()) {
    const error = new Error('note مطلوب عند decision = reject')
    error.code = 'VALIDATION_ERROR'
    throw error
  }

  const assignmentsValidationError = validateCompleteTaskAssignmentsForStage({
    payload,
    configJson: stageConfig?.config_json || null,
    isReject
  })

  if (assignmentsValidationError) {
    const error = new Error(assignmentsValidationError)
    error.code = 'VALIDATION_ERROR'
    throw error
  }

  // قبل قبول الإكمال: إن كانت العملية تنشئ بطاقة ذاتية، امنع التكرار
  if (!isReject) {
    const resolvedProcessDefinitionId =
      processDefinitionId ||
      transaction?.process_instance?.process_definition_id ||
      null

    if (resolvedProcessDefinitionId) {
      try {
        await assertUpcomingSelfCardCreateUniqueness({
          processDefinitionId: resolvedProcessDefinitionId,
          formPayload: normalizedPayload
        })
      } catch (conflictErr) {
        if (conflictErr?.code === 'CONFLICT') {
          const error = new Error(conflictErr.message)
          error.code = 'CONFLICT'
          error.statusCode = 409
          error.data = conflictErr.data || null
          throw error
        }
        throw conflictErr
      }
    }
  }

  let overrideTarget = null

  if (!isReject) {
    overrideTarget = await resolveDestinationOverrideFromComplete({
      payload,
      configJson: stageConfig?.config_json || null,
      isReject
    })

    if (overrideTarget) {
      logStep('PHASE_6_RESOLVE_DESTINATION', {
        camundaGroupKey: overrideTarget.camunda_group_key,
        orgDeptRoleId: overrideTarget.organization_department_roles_id
      })
    }
  }

  let signingRequest = null

  if (needsSignature) {
    logStep('PHASE_7_VERIFY_SIGNATURE')

    const challengeId =
      payload.signature?.challenge_id || payload.signature?.signing_id
    const signature = payload.signature?.signature

    if (!challengeId || !signature) {
      const error = new Error(
        'التوقيع الرقمي مطلوب — POST /api/workflow/tasks/{taskId}/signing-challenge ثم أرسل signature مع complete'
      )
      error.code = 'SIGNATURE_REQUIRED'
      throw error
    }

    if (!signingDecision) {
      const error = new Error(
        'decision مطلوب عند إكمال المهمة مع التوقيع الرقمي (approve أو reject)'
      )
      error.code = 'VALIDATION_ERROR'
      throw error
    }

    signingRequest = {
      challengeId,
      signature,
      decision: signingDecision
    }

    await verifySignatureForComplete({
      challengeId,
      signature,
      userId,
      decision: signingDecision,
      clientMeta,
      expectedTaskId: task.id,
      stageDataHash: computeSigningStageDataHash(
        {
          ...normalizedPayload,
          assignments: payload.assignments
        },
        signingDecision
      )
    })

    logStep('SIGNATURE_VERIFIED', { challengeId, decision: signingDecision })

    if (typeof acquireOperationGuard === 'function' && idempotencyKey) {
      await acquireOperationGuard()
    }
  } else if (typeof acquireOperationGuard === 'function' && idempotencyKey) {
    logStep('PHASE_7_SKIP_SIGNATURE', { reason: 'not_required' })
    await acquireOperationGuard()
  }

  return {
    signingDecision,
    isReject,
    stageConfig,
    needsSignature,
    normalizedPayload,
    overrideTarget,
    signingRequest
  }
}

module.exports = {
  resolveDecisionAndValidateComplete
}
