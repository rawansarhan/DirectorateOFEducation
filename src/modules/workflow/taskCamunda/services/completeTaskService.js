const camundaClient = require('../../../../core/shared/clients/camunda/camundaClient')
const { v4: uuidv4 } = require('uuid')

const transactionClient = require('../../../../core/shared/clients/transaction/transactionClient')

const processInstanceRepository = require('../repositories/processInstanceRepository')
const employeeTaskRepository = require('../repositories/employeeTaskRepository')

const stageRepository = require('../../processDefinition/repositories/stageRepository')

const ActionStrategyFactory = require('../../actions/ActionStrategyFactory')
const stageConfigRepository = require('../../stageConfig/repositories/stageConfigRepository')
const {
  normalizeActionPayload,
  resolveActionsForStage
} = require('../../actions/actionHelpers')
const {
  validateAndNormalizeUnifiedFormPayload,
  buildCamundaGatewayVariables
} = require('../../services/unifiedFormPayloadService')
const { buildStoredStageData } = require('../../services/stageSubmissionService')
const {
  registerTransactionFiles
} = require('../../../transaction/document/services/documentFileService')
const {
  registerTemplatesForTransaction
} = require('../../../transaction/document/services/documentInstanceService')
const {
  requiresDigitalSignature,
  verifySignatureForComplete,
  persistVerifiedSignature,
  buildTransactionSignatureLedger,
  appendSignatureToTransactionData
} = require('./transactionSigningService')
const { appendIntegrityLink } =
  require('../../../transaction/integrityChain/services/integrityChainService')
const { createProcessStage } =
  require('../../../transaction/process_instance_stage/services/processInstanceStageService')
const transactionRepository =
  require('../../../transaction/transaction/repositories/transactionRepository')
const {
  assessFinalDocumentReadiness,
  assertReadyForWorkflowCompletion
} = require('../../../transaction/document/services/finalDocumentReadinessService')
const securityGuardService = require('../../../../core/security/securityGuardService')
const {
  invalidateEmployeeTasksForUser,
  deleteKeysByPattern,
  invalidateEmployeeTaskStats,
  invalidateTaskDetails
} = require('../../../../core/cache/apiCacheService')
const operationGuardService = require('../../../../core/security/operationGuardService')
const documentTemplateRepository =
  require('../../../requirements/DocTemp/repositories/documentTemplateRepository')
const documentInstanceRepository =
  require('../../../transaction/document/repositories/documentInstanceRepository')
const { normalizeSigningDecision } = require('../../schemas/signingChallengeSchema')
const {
  assertTaskLockHolder,
  releaseTaskLock
} = require('./taskLockService')
const {
  toCompleteTaskResponse,
  toPublicSignatureRecord
} = require('../mappers/taskCamundaMapper')
const {
  notifyTransactionOwnerOnReject
} = require('../../../transaction/notification/services/transactionRejectNotificationService')
const { enrichCamundaTaskNotFoundError } = require('../../../../core/utils/errorMessageHelper')
const { formatTransactionDate } = require('../utils/employeeTaskFormatters')

const LOG_PREFIX = '[CompleteTask]'

const ROOT_SUBMISSION_DATA_KEYS = [
  'stage_name',
  'form_id',
  'form_name',
  'widgets',
  'templates',
  'decision',
  'note',
  'files',
  'fields',
  'completed_by',
  'completed_at'
]

function shouldPersistAuthSubmissionAtRoot ({ isAutoComplete, stage }) {
  return Boolean(isAutoComplete && stage?.auth_type === 'AUTH')
}

function buildRootSubmissionSnapshot (transactionData = {}) {
  const snapshot = {}

  for (const key of ROOT_SUBMISSION_DATA_KEYS) {
    if (Object.prototype.hasOwnProperty.call(transactionData, key)) {
      snapshot[key] = transactionData[key]
    }
  }

  return snapshot
}

function buildAutoCompleteAuthPayload (transactionData = {}) {
  const snapshot = buildRootSubmissionSnapshot(transactionData)

  return {
    form_id: snapshot.form_id,
    form_name: snapshot.form_name,
    widgets: Array.isArray(snapshot.widgets) ? snapshot.widgets : [],
    templates: (snapshot.templates || [])
      .map(item => ({
        id: item.id_template ?? item.id ?? null,
        value: item.value ?? {}
      }))
      .filter(item => item.id != null),
    note: snapshot.note ?? '',
    decision: snapshot.decision ?? 'submit'
  }
}

/**
 * Structured step logger for the complete-task workflow.
 * Keeps logs grep-friendly: [CompleteTask] STEP | key=value ...
 */
function logStep (step, meta = {}) {
  const details = Object.entries(meta)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${value}`)
    .join(' ')

  console.log(`${LOG_PREFIX} ${step}${details ? ` | ${details}` : ''}`)
}

/**
 * Runs workflow actions (email, PDF, notification, etc.) for the current stage.
 * Each action is resolved through ActionStrategyFactory and executed sequentially.
 */
async function executeActions (actions, context) {
  logStep('ACTIONS_START', {
    count: actions.length,
    stageCode: context.stage?.code,
    transactionId: context.transaction?.id
  })

  const results = []

  for (const action of actions) {
    logStep('ACTION_EXECUTE', { action: action.name })

    const strategy = ActionStrategyFactory.make(action.name)
    const actionPayload = normalizeActionPayload(action)

    const result = await strategy.execute({
      payload: actionPayload,
      context
    })

    logStep('ACTION_DONE', {
      action: action.name,
      status: result?.status || 'ok'
    })

    results.push({
      name: action.name,
      ...actionPayload,
      result
    })
  }

  logStep('ACTIONS_DONE', { count: results.length })

  return results
}

/**
 * Enriches template snapshots for API response.
 *
 * transaction.data[stage].templates shape:
 *   { id, document_instance_id, values }
 *
 * generated_pdf_path: from document_instance after GENERATE_PDF (SERVICE_TASK)
 */
async function enrichTemplatesForResponse (templates = []) {
  const enriched = []

  for (const template of templates) {
    const templateId =
      template.id_template ?? template.id ?? template.template_id ?? null
    const documentInstanceId =
      template.id_document_instance ?? template.document_instance_id ?? null
    const row = templateId
      ? await documentTemplateRepository.findById(templateId)
      : null

    let generatedPdfPath = template.generated_pdf_path ?? null

    if (documentInstanceId && !generatedPdfPath) {
      const instance = await documentInstanceRepository.findById(
        documentInstanceId
      )
      generatedPdfPath = instance?.generated_pdf_path ?? null
    }

    enriched.push({
      id: templateId,
      id_template: templateId,
      document_instance_id: documentInstanceId,
      id_document_instance: documentInstanceId,
      value: template.values ?? template.value ?? {},
      values: template.values ?? template.value ?? {},
      path: row?.file_path || template.path || null,
      generated_pdf_path: generatedPdfPath
    })
  }

  return enriched
}

/**
 * Builds the unified success response returned by POST /tasks/:taskId/complete.
 */
function buildCompleteResponse ({
  stage,
  stageSnapshot,
  variables = null,
  signingRequest,
  idempotencyKey,
  idempotentReplay,
  workflowStatus,
  templates
}) {
  return {
    message:
      stageSnapshot.decision === 'reject'
        ? 'تم رفض المعاملة بنجاح'
        : 'تم إكمال المهمة بنجاح',
    data: toCompleteTaskResponse({
      stage,
      stageSnapshot,
      variables,
      signatureRequest: signingRequest,
      idempotencyKey,
      idempotentReplay,
      workflowStatus,
      templates
    })
  }
}

/**
 * After a user task completes, Camunda may advance through SERVICE_TASK nodes.
 * This function detects newly completed service tasks and runs their configured actions,
 * storing results under transaction.data[stageCode].
 */
async function runServiceTaskActions ({
  processInstance,
  transaction,
  transactionData,
  task,
  userId
}) {
  logStep('SERVICE_TASKS_CHECK', {
    processInstanceId: processInstance.id,
    transactionId: transaction.id
  })

  const executedServiceTasks = new Set(
    transactionData._executedServiceTasks || []
  )

  const completedServiceTaskKeys =
    await camundaClient.getCompletedServiceTaskKeys(
      processInstance.camunda_process_instance_id
    )

  const newServiceTaskKeys = completedServiceTaskKeys.filter(
    key => !executedServiceTasks.has(key)
  )

  if (!newServiceTaskKeys.length) {
    logStep('SERVICE_TASKS_NONE')
    return transactionData
  }

  logStep('SERVICE_TASKS_FOUND', {
    keys: newServiceTaskKeys.join(',')
  })

  for (const taskKey of newServiceTaskKeys) {
    const serviceStage = await stageRepository.findByCodeAndProcess(
      processInstance.process_definition_id,
      taskKey
    )

    if (!serviceStage || serviceStage.type !== 'SERVICE_TASK') {
      logStep('SERVICE_TASK_SKIP', { taskKey, reason: 'not_service_task' })
      executedServiceTasks.add(taskKey)
      continue
    }

    const stageConfig =
      await stageConfigRepository.findByStageId(serviceStage.id)

    const actions = resolveActionsForStage(serviceStage, stageConfig)

    if (!actions.length) {
      logStep('SERVICE_TASK_SKIP', { taskKey, reason: 'no_actions' })
      executedServiceTasks.add(taskKey)
      continue
    }

    logStep('SERVICE_TASK_RUN', {
      taskKey,
      stageCode: serviceStage.code,
      actionCount: actions.length
    })

    const actionResults = await executeActions(actions, {
      task,
      transaction,
      processInstance,
      stage: serviceStage,
      userId
    })

    transactionData[serviceStage.code] = {
      ...(transactionData[serviceStage.code] || {}),
      stage_name: serviceStage.name,
      form_id: stageConfig?.config_json?.form_id ?? null,
      form_name: stageConfig?.config_json?.form_name ?? null,
      actions: [
        ...(transactionData[serviceStage.code]?.actions || []),
        ...actionResults
      ],
      executed_at: new Date(),
      executed_by: 'system',
      completed_at: new Date()
    }

    executedServiceTasks.add(taskKey)
  }

  transactionData._executedServiceTasks = [...executedServiceTasks]

  logStep('SERVICE_TASKS_DONE')

  return transactionData
}

function buildCompleteTaskGuardKey (taskId) {
  return `complete:${taskId}`
}

async function withDbTransaction (sequelize, parentTx, fn) {
  if (parentTx) {
    return fn(parentTx)
  }

  return sequelize.transaction(fn)
}

/**
 * Public entry point for completing a Camunda user task.
 *
 * Responsibilities:
 * - Account lock check
 * - Idempotency / duplicate-submit protection
 * - Delegates business logic to completeTaskCore
 * - Commits or releases the operation guard
 */
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

  // Step 1: Block locked accounts from completing tasks.
  await securityGuardService.assertAccountNotLocked(userId)
  logStep('SECURITY_OK', { userId })

  const guardKey = !isAutoComplete ? buildCompleteTaskGuardKey(taskId) : null
  const issuedIdempotencyKey = !isAutoComplete ? uuidv4() : null
  const idempotencyKey = guardKey

  let guardContext = null

  // Step 2: Return cached response if this request was already processed.
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
    // Step 3: Run the main workflow inside the guard window.
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

    // Step 4: Persist successful result for idempotent replay.
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

/**
 * Core complete-task pipeline.
 *
 * High-level order:
 * 1. Load task / process / transaction / stage
 * 2. Validate lock, stage name, signature, and reject payload
 * 3. Build stage snapshot (fields, files, templates, note)
 * 4. Execute optional stage actions
 * 5. Complete Camunda task (must succeed before DB writes)
 * 6. Persist signature + transaction.data
 * 7. Persist stage + transaction.data in one DB transaction
 * 8. Branch: reject → cancel workflow + notify owner | approve → advance or finish
 * 9. Release lock + invalidate caches
 */
async function completeTaskCore ({
  taskId,
  userId,
  payload,
  clientMeta = {},
  isAutoComplete = false,
  idempotencyKey = null,
  acquireOperationGuard = null,
  requireSignature = false,
  issuedIdempotencyKey = null,
  dbTransaction = null
}) {
  // ------------------------------------------------------------------
  // Phase 1: Load Camunda task
  // ------------------------------------------------------------------
  logStep('PHASE_1_LOAD_TASK', { taskId })

  let task

  try {
    task = await camundaClient.getTaskById(taskId)
  } catch (err) {
    throw await enrichCamundaTaskNotFoundError(
      err,
      taskId,
      (id) => camundaClient.getTaskNotFoundDiagnostics(id)
    )
  }

  if (!task) {
    throw new Error('Task not found')
  }

  logStep('TASK_LOADED', {
    taskId: task.id,
    taskDefinitionKey: task.taskDefinitionKey,
    processInstanceId: task.processInstanceId
  })

  // ------------------------------------------------------------------
  // Phase 2: Load local process instance linked to Camunda
  // ------------------------------------------------------------------
  logStep('PHASE_2_LOAD_PROCESS_INSTANCE')

  const processInstance = await processInstanceRepository.findByCamundaId(
    task.processInstanceId,
    dbTransaction
  )

  if (!processInstance) {
    throw new Error('Process instance not found')
  }

  logStep('PROCESS_INSTANCE_LOADED', {
    processInstanceId: processInstance.id,
    transactionId: processInstance.transaction_id,
    status: processInstance.status
  })

  // ------------------------------------------------------------------
  // Phase 3: Load transaction (business record owned by the applicant)
  // ------------------------------------------------------------------
  logStep('PHASE_3_LOAD_TRANSACTION', {
    transactionId: processInstance.transaction_id
  })

  const transaction = dbTransaction
    ? await transactionRepository.findById(processInstance.transaction_id, dbTransaction)
    : await transactionClient.getTransactionById(processInstance.transaction_id)

  if (!transaction) {
    throw new Error('Transaction not found')
  }

  let currentVersion = payload.expected_version ?? transaction.version

  logStep('TRANSACTION_LOADED', {
    transactionId: transaction.id,
    idProcess: transaction.id_process || '',
    version: currentVersion,
    status: transaction.status
  })

  // ------------------------------------------------------------------
  // Phase 4: Ensure the caller holds the task lock (manual tasks only)
  // ------------------------------------------------------------------
  if (!isAutoComplete) {
    logStep('PHASE_4_ASSERT_TASK_LOCK', { taskId: task.id, userId })

    await assertTaskLockHolder({
      processInstanceId: processInstance.id,
      taskId: task.id,
      userId
    })

    logStep('TASK_LOCK_OK', { taskId: task.id, userId })
  } else {
    logStep('PHASE_4_SKIP_TASK_LOCK', { reason: 'auto_complete' })
  }

  // ------------------------------------------------------------------
  // Phase 5: Resolve workflow stage from task definition key
  // ------------------------------------------------------------------
  logStep('PHASE_5_LOAD_STAGE', { taskDefinitionKey: task.taskDefinitionKey })

  const stage = await stageRepository.findByCodeAndProcess(
    processInstance.process_definition_id,
    task.taskDefinitionKey
  )

  if (!stage) {
    throw new Error('Stage not found')
  }

  logStep('STAGE_LOADED', {
    stageId: stage.id,
    stageCode: stage.code,
    stageName: stage.name,
    stageType: stage.type
  })

  // ------------------------------------------------------------------
  // Phase 6: Resolve decision (approve / reject) and stage config
  // ------------------------------------------------------------------
  logStep('PHASE_6_RESOLVE_DECISION')

  const signingDecision = payload.decision
    ? normalizeSigningDecision(payload.decision)
    : null
  const isReject = signingDecision === 'reject'

  const stageConfig = await stageConfigRepository.findByStageId(stage.id)
  const needsSignature =
    requireSignature ||
    requiresDigitalSignature(
      stage,
      payload,
      stageConfig,
      { isAutoComplete }
    )

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
    const authPayload = buildAutoCompleteAuthPayload(transaction.data || {})

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

  let signingRequest = null

  // ------------------------------------------------------------------
  // Phase 7: Verify USB digital signature when required
  // ------------------------------------------------------------------
  if (needsSignature) {
    logStep('PHASE_7_VERIFY_SIGNATURE')

    const challengeId =
      payload.signature?.challenge_id || payload.signature?.signing_id
    const signature = payload.signature?.signature

    if (!challengeId || !signature) {
      throw new Error(
        'Digital signature is required. Call POST /tasks/:taskId/signing-challenge first.'
      )
    }

    if (!signingDecision) {
      throw new Error(
        'decision is required when completing a task with digital signature'
      )
    }

    if (isReject && !String(payload.rejection_reason || '').trim()) {
      const error = new Error('rejection_reason is required when decision is reject')
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
      expectedTaskId: task.id
    })

    logStep('SIGNATURE_VERIFIED', { challengeId, decision: signingDecision })

    if (typeof acquireOperationGuard === 'function' && idempotencyKey) {
      await acquireOperationGuard()
    }
  } else if (typeof acquireOperationGuard === 'function' && idempotencyKey) {
    logStep('PHASE_7_SKIP_SIGNATURE', { reason: 'not_required' })
    await acquireOperationGuard()
  }

  // ------------------------------------------------------------------
  // Phase 8: Build stage snapshot to store under transaction.data[stage.code]
  // ------------------------------------------------------------------
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
    logStep('TEMPLATES_REGISTER', { count: normalizedPayload.templates.length })

    const registeredTemplates = await registerTemplatesForTransaction({
      transactionId: transaction.id,
      templates: normalizedPayload.templates
    })

    collectedTemplates.push(...registeredTemplates)

    logStep('TEMPLATES_REGISTERED', { count: registeredTemplates.length })
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
    stageSnapshot.rejection_reason = String(payload.rejection_reason).trim()
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

  // ------------------------------------------------------------------
  // Phase 9: Execute stage actions
  // USER_TASK: payload.actions (اختياري)
  // SERVICE_TASK: config_json.actions تلقائياً — مثل GENERATE_PDF, SEND_EMAIL
  // ------------------------------------------------------------------
  logStep('PHASE_9_EXECUTE_ACTIONS', { stageType: stage.type })

  if (Array.isArray(payload.actions) && payload.actions.length) {
    await executeActions(payload.actions, {
      task,
      transaction,
      processInstance,
      stage,
      userId
    })
  } else if (stage.type === 'SERVICE_TASK') {
    const autoActions = resolveActionsForStage(stage, stageConfig)

    if (autoActions.length) {
      await executeActions(autoActions, {
        task,
        transaction,
        processInstance,
        stage,
        userId
      })
    } else {
      logStep('ACTIONS_SKIP', { reason: 'no_actions_configured' })
    }
  } else {
    logStep('ACTIONS_SKIP', { reason: 'user_task_no_payload_actions' })
  }

  // ------------------------------------------------------------------
  // Phase 10: Prepare Camunda routing variables (gateway decision)
  // ------------------------------------------------------------------
  logStep('PHASE_10_PREPARE_CAMUNDA_VARIABLES')

  const variables = buildCamundaGatewayVariables({
    isReject,
    gatewayValue: normalizedPayload.gateway_value,
    signingDecision
  })

  const routingValue = variables.value?.value || signingDecision || 'approve'

  logStep('CAMUNDA_VARIABLES_READY', { value: routingValue })

  // ------------------------------------------------------------------
  // Phase 11: Complete Camunda task BEFORE any DB persistence
  // (If Camunda fails, nothing is written locally.)
  // ------------------------------------------------------------------
  logStep('PHASE_11_ASSERT_TASK_STILL_ACTIVE', { taskId: task.id })

  try {
    await camundaClient.getTaskById(task.id)
  } catch (err) {
    if (err.expose && err.details && typeof err.details === 'object') {
      err.details.stage_name = stage?.name || null
      err.details.stage_code = stage?.code || null
      err.details.hint =
        'المهمة كانت نشطة عند بدء الطلب لكن اختفت قبل الإكمال — غالباً إكمال مكرر أو طلب موازٍ.'
    }

    throw err
  }

  logStep('PHASE_11_COMPLETE_CAMUNDA_TASK', { taskId: task.id })

  try {
    await camundaClient.completeTask(task.id, variables)
  } catch (err) {
    if (err.expose && err.details && typeof err.details === 'object') {
      err.details.stage_name = stage?.name || null
      err.details.stage_code = stage?.code || null
    }

    throw err
  }

  logStep('CAMUNDA_TASK_COMPLETED', { taskId: task.id })

  // ------------------------------------------------------------------
  // Phase 13: Merge stage snapshot into transaction.data (in memory)
  // ------------------------------------------------------------------
  logStep('PHASE_13_MERGE_TRANSACTION_DATA', { stageCode: stage.code })

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

  if (!isReject) {
    transactionData = await runServiceTaskActions({
      processInstance,
      transaction,
      transactionData,
      task,
      userId
    })
  } else {
    logStep('SERVICE_TASKS_SKIP', { reason: 'reject_path' })
  }

  // ------------------------------------------------------------------
  // Phases 12–16: DB persistence — commit together or rollback together
  // ------------------------------------------------------------------
  let digitalSignatureRecord = null
  const sequelize = processInstanceRepository.getSequelize()
  const stagePersistenceStatus = isReject ? 'rejected' : 'completed'

  logStep('PHASE_12_16_DB_TRANSACTION', {
    transactionId: transaction.id,
    stageCode: stage.code,
    status: stagePersistenceStatus
  })

  await withDbTransaction(sequelize, dbTransaction, async (dbTx) => {
    if (signingRequest) {
      logStep('PHASE_12_PERSIST_SIGNATURE', {
        challengeId: signingRequest.challengeId
      })

      digitalSignatureRecord = await persistVerifiedSignature({
        challengeId: signingRequest.challengeId,
        signature: signingRequest.signature,
        userId,
        clientMeta,
        dbTransaction: dbTx
      })

      stageSnapshot.digital_signature =
        toPublicSignatureRecord(digitalSignatureRecord)

      appendSignatureToTransactionData(transactionData, digitalSignatureRecord)

      logStep('SIGNATURE_PERSISTED', {
        digitalSignatureId: digitalSignatureRecord.digital_signature_id
      })
    } else {
      logStep('PHASE_12_SKIP_SIGNATURE_PERSIST', { reason: 'no_signing_request' })
    }

    logStep('PHASE_14_SAVE_TRANSACTION_DATA', {
      transactionId: transaction.id,
      version: currentVersion
    })

    const updatedTransaction = await transactionRepository.updateDataOptimistic(
      transaction.id,
      transactionData,
      currentVersion,
      dbTx
    )

    currentVersion = updatedTransaction.version

    logStep('TRANSACTION_DATA_SAVED', {
      transactionId: transaction.id,
      version: currentVersion
    })

    if (digitalSignatureRecord) {
      logStep('PHASE_15_APPEND_INTEGRITY_LINK')

      await appendIntegrityLink({
        transactionId: transaction.id,
        digitalSignatureId: digitalSignatureRecord.digital_signature_id,
        challengeId: signingRequest?.challengeId || null,
        stageId: stage.id,
        stageCode: stage.code,
        stageData: transactionData[stage.code],
        signatureHash: digitalSignatureRecord.signed_hash,
        signedAt: digitalSignatureRecord.signed_at,
        dbTransaction: dbTx
      })

      logStep('INTEGRITY_LINK_APPENDED')
    }

    logStep('PHASE_16_CREATE_PROCESS_STAGE', { status: stagePersistenceStatus })

    const processStageData = persistAuthSubmissionAtRoot
      ? buildRootSubmissionSnapshot(transactionData)
      : transactionData[stage.code]

    await createProcessStage({
      transactionId: transaction.id,
      stageCode: stage.code,
      stageName: stage.name,
      status: stagePersistenceStatus,
      data: processStageData,
      assigned_to: userId
    }, { transaction: dbTx })

    logStep('PROCESS_STAGE_CREATED', { status: stagePersistenceStatus })
  })

  if (signingRequest && digitalSignatureRecord) {
    await securityGuardService.recordSuccess({
      userId,
      action: 'TX_SIGN_VERIFIED',
      resourceType: 'task',
      resourceId: task.id,
      ipAddress: clientMeta.ip,
      userAgent: clientMeta.userAgent,
      details: {
        signingId: signingRequest.challengeId,
        digitalSignatureId: digitalSignatureRecord.digital_signature_id,
        stageCode: stage.code
      }
    })
  }

  const responseTemplates = await enrichTemplatesForResponse(stageSnapshot.templates)

  let workflowStatus = 'running'
  let nextStageId = null

  // ------------------------------------------------------------------
  // Phase 17: Reject path — cancel Camunda, update status, notify owner
  // ------------------------------------------------------------------
  if (isReject) {
    logStep('PHASE_17_REJECT_FLOW_START', { transactionId: transaction.id })

    let activeTasks = await camundaClient.getActiveTasks(
      processInstance.camunda_process_instance_id
    )

    if (activeTasks.length) {
      logStep('REJECT_CANCEL_CAMUNDA', {
        camundaProcessInstanceId: processInstance.camunda_process_instance_id,
        activeTaskCount: activeTasks.length
      })

      await camundaClient.deleteProcessInstance(
        processInstance.camunda_process_instance_id
      )
      activeTasks = []
    }

    await withDbTransaction(sequelize, dbTransaction, async (dbTx) => {
      await processInstanceRepository.update(processInstance.id, {
        status: 'cancelled',
        current_stage_id: null
      }, dbTx)

      await transactionRepository.updateStatus(transaction.id, 'rejected', dbTx)

      transactionData._digital_signatures_ledger =
        await buildTransactionSignatureLedger(transaction.id)

      await transactionRepository.updateDataOptimistic(
        transaction.id,
        transactionData,
        currentVersion,
        dbTx
      )
    })

    workflowStatus = 'rejected'

    logStep('REJECT_FLOW_DONE', {
      transactionId: transaction.id,
      workflowStatus
    })

    // Fire-and-forget Firebase push to the transaction owner (applicant).
    notifyTransactionOwnerOnReject({
      transaction,
      stage,
      note: stageSnapshot.note || '',
      rejectionReason: stageSnapshot.rejection_reason || '',
      processInstanceId: processInstance.id,
      sentByUserId: userId
    }).catch(() => {})
  } else {
    // ------------------------------------------------------------------
    // Phase 17: Approve path — advance to next stage or finish workflow
    // ------------------------------------------------------------------
    logStep('PHASE_17_APPROVE_FLOW_START')

    const nextTasks = await camundaClient.getActiveTasks(
      processInstance.camunda_process_instance_id
    )

    const nextTask = nextTasks?.[0] || null

    if (nextTask) {
      const nextStage = await stageRepository.findByCodeAndProcess(
        processInstance.process_definition_id,
        nextTask.taskDefinitionKey
      )

      await processInstanceRepository.update(processInstance.id, {
        current_stage_id: nextStage?.id || null,
        status: 'running'
      }, dbTransaction)

      nextStageId = nextStage?.id || null

      logStep('APPROVE_ADVANCED', {
        nextTaskId: nextTask.id,
        nextStageCode: nextStage?.code || '',
        workflowStatus: 'running'
      })
    } else {
      logStep('APPROVE_WORKFLOW_FINISHING', { transactionId: transaction.id })

      const readiness = await assessFinalDocumentReadiness(transaction.id, {
        requireCompleted: false,
        flushGeneratePdf: true
      })

      assertReadyForWorkflowCompletion(readiness)

      await withDbTransaction(sequelize, dbTransaction, async (dbTx) => {
        await processInstanceRepository.update(processInstance.id, {
          status: 'completed',
          current_stage_id: null
        }, dbTx)

        await transactionRepository.updateStatus(transaction.id, 'completed', dbTx)

        transactionData._digital_signatures_ledger =
          await buildTransactionSignatureLedger(transaction.id)

        await transactionRepository.updateDataOptimistic(
          transaction.id,
          transactionData,
          currentVersion,
          dbTx
        )
      })

      workflowStatus = 'completed'

      logStep('WORKFLOW_COMPLETED', {
        transactionId: transaction.id,
        processInstanceId: processInstance.id
      })
    }
  }

  // ------------------------------------------------------------------
  // Phase 18: Release task lock (manual tasks only)
  // ------------------------------------------------------------------
  if (!isAutoComplete) {
    logStep('PHASE_18_RELEASE_TASK_LOCK', { taskId: task.id, userId })

    await releaseTaskLock({
      processInstanceId: processInstance.id,
      taskId: task.id,
      userId
    })

    logStep('TASK_LOCK_RELEASED', { taskId: task.id, userId })
  }

  // ------------------------------------------------------------------
  // Phase 19: Invalidate employee task caches
  // ------------------------------------------------------------------
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

  // المهمة اكتملت → أبطل كاش تفاصيلها
  invalidateTaskDetails(task.id).catch(() => {})

  if (workflowStatus === 'completed' || isReject) {
    deleteKeysByPattern('employee-tasks:*:depts:*').catch(() => {})
  }

  logStep('CORE_DONE', {
    taskId: task.id,
    transactionId: transaction.id,
    stageCode: stage.code,
    workflowStatus
  })

  return buildCompleteResponse({
    stage,
    stageSnapshot,
    variables: routingValue ? { value: routingValue } : null,
    signingRequest,
    idempotencyKey: issuedIdempotencyKey,
    idempotentReplay: false,
    workflowStatus,
    templates: responseTemplates
  })
}

module.exports = {
  completeTask,
  buildAutoCompleteAuthPayload
}
