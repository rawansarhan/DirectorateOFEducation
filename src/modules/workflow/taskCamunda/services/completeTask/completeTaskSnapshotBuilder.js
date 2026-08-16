'use strict'

const { buildStoredStageData } = require('../../../services/stageSubmissionService')
const {
  registerTransactionFiles,
  registerTemplatesForTransaction
} = require('../../../../transaction/public')
const {
  shouldPersistAuthSubmissionAtRoot,
  logStep
} = require('./completeTaskHelpers')
const { formatTransactionDate } = require('../../utils/employeeTaskFormatters')
const { runServiceTaskActions } = require('./completeTaskActionsRunner')

async function buildStageSnapshot ({
  payload,
  normalizedPayload,
  signingDecision,
  stage,
  stageConfig,
  transaction,
  userId,
  isAutoComplete = false,
  isReject = false,
  overrideTarget = null
}) {
  logStep('PHASE_8_BUILD_STAGE_SNAPSHOT', { stageCode: stage.code })

  const collectedFields = []
  const collectedFiles = []
  const collectedTemplates = []

  if (Array.isArray(normalizedPayload.fields)) {
    for (const field of normalizedPayload.fields) {
      collectedFields.push({
        key: field.key || field.name,
        value: field.value
      })
    }
  }

  if (Array.isArray(normalizedPayload.files) && normalizedPayload.files.length) {
    const skipFileRegistration =
      isAutoComplete && stage?.auth_type === 'AUTH'

    if (skipFileRegistration) {
      logStep('FILES_REGISTER_SKIP', { reason: 'auth_auto_complete_already_registered' })
      collectedFiles.push(...normalizedPayload.files)
    } else {
      logStep('FILES_REGISTER', { count: normalizedPayload.files.length })

      const registeredFiles = await registerTransactionFiles({
        transactionId: transaction.id,
        files: normalizedPayload.files,
        userId
      })

      collectedFiles.push(...registeredFiles)

      logStep('FILES_REGISTERED', { count: registeredFiles.length })
    }
  }

  if (Array.isArray(normalizedPayload.templates) && normalizedPayload.templates.length) {
    const skipTemplateRegistration =
      isAutoComplete &&
      stage?.auth_type === 'AUTH' &&
      Array.isArray(transaction.data?.templates) &&
      transaction.data.templates.some(
        item =>
          (item?.id_template ?? item?.id ?? item?.template_id) != null &&
          (item?.values != null || item?.value != null)
      )

    if (skipTemplateRegistration) {
      logStep('TEMPLATES_REGISTER_SKIP', {
        reason: 'auth_auto_complete_already_registered'
      })
      collectedTemplates.push(...transaction.data.templates)
    } else {
      logStep('TEMPLATES_REGISTER', { count: normalizedPayload.templates.length })

      const registeredTemplates = await registerTemplatesForTransaction({
        transactionId: transaction.id,
        templates: normalizedPayload.templates
      })

      collectedTemplates.push(...registeredTemplates)

      logStep('TEMPLATES_REGISTERED', { count: registeredTemplates.length })
    }
  }

  const stageSnapshot = buildStoredStageData(
    {
      form_id: normalizedPayload.form_id,
      form_name: normalizedPayload.form_name,
      widgets: normalizedPayload.widgets,
      stage_name: stage.name,
      fields: collectedFields,
      files: collectedFiles,
      templates: collectedTemplates,
      gateway_value: normalizedPayload.gateway_value,
      decision: signingDecision || normalizedPayload.decision || null,
      note: normalizedPayload.note ?? normalizedPayload.notes ?? ''
    },
    {
      stageName: stage.name,
      configJson: stageConfig?.config_json || null
    }
  )

  if (isReject) {
    const rejectNote = String(
      normalizedPayload.note ?? payload.note ?? ''
    ).trim()
    stageSnapshot.rejection_reason = String(
      payload.rejection_reason || rejectNote
    ).trim()
  }

  if (overrideTarget) {
    stageSnapshot.assignments = Array.isArray(payload.assignments)
      ? payload.assignments
      : []
    stageSnapshot.next_destination = {
      camunda_group_key: overrideTarget.camunda_group_key,
      organization_department_roles_id:
        overrideTarget.organization_department_roles_id,
      organization_id: overrideTarget.organization_id,
      department_id: overrideTarget.department_id,
      role_id: overrideTarget.role_id
    }
  }

  logStep('STAGE_SNAPSHOT_BUILT', {
    stageCode: stage.code,
    widgetCount: Array.isArray(stageSnapshot.widgets)
      ? stageSnapshot.widgets.length
      : 0,
    fieldCount: collectedFields.length,
    fileCount: collectedFiles.length,
    templateCount: collectedTemplates.length,
    decision: stageSnapshot.decision || '',
    hasNote: Boolean(stageSnapshot.note)
  })

  return stageSnapshot
}

async function mergeStageSnapshotIntoTransactionData ({
  transaction,
  stage,
  stageSnapshot,
  userId,
  isAutoComplete,
  isReject,
  processInstance,
  task,
  // SERVICE_TASK يعتمد على اكتمال Camunda — يُشغَّل بعد completeCamunda
  skipServiceTasks = false
}) {
  logStep('PHASE_13_MERGE_TRANSACTION_DATA', {
    stageCode: stage.code,
    skipServiceTasks
  })

  const {
    freezeSealedStageData
  } = require('../../../../transaction/process_instance_stage/services/processInstanceStageService')

  let transactionData = {
    ...(transaction.data || {})
  }

  const completedAt = formatTransactionDate(new Date())
  const persistAuthSubmissionAtRoot = shouldPersistAuthSubmissionAtRoot({
    isAutoComplete,
    stage
  })

  if (persistAuthSubmissionAtRoot) {
    logStep('PHASE_13_AUTH_ROOT_ONLY', {
      stageCode: stage.code,
      reason: 'auth_auto_complete_skip_activity_key'
    })

    transactionData.completed_by = userId
    transactionData.completed_at = completedAt

    if (Object.prototype.hasOwnProperty.call(transactionData, stage.code)) {
      delete transactionData[stage.code]
    }
  } else {
    transactionData[stage.code] = {
      ...stageSnapshot,
      completed_by: userId,
      completed_at: completedAt
    }
  }

  transactionData = await freezeSealedStageData({
    transactionId: transaction.id,
    incomingData: transactionData,
    existingData: transaction.data || {},
    allowStageCode: persistAuthSubmissionAtRoot ? null : stage.code
  })

  if (!isReject && !skipServiceTasks) {
    transactionData = await runServiceTaskActions({
      processInstance,
      transaction,
      transactionData,
      task,
      userId
    })
  } else if (isReject) {
    logStep('SERVICE_TASKS_SKIP', { reason: 'reject_path' })
  } else {
    logStep('SERVICE_TASKS_DEFER', { reason: 'awaiting_camunda_complete' })
  }

  return {
    transactionData,
    persistAuthSubmissionAtRoot
  }
}

module.exports = {
  buildStageSnapshot,
  mergeStageSnapshotIntoTransactionData
}
