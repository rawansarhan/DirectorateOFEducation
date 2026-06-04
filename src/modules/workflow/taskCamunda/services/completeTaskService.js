const camundaClient = require('../../../../core/shared/clients/camunda/camundaClient')

const transactionClient = require('../../../../core/shared/clients/transaction/transactionClient')

const processInstanceRepository = require('../repositories/processInstanceRepository')

const stageRepository = require('../../repositories/stageRepository')

const outboxRepository = require('../../../../core/shared/outbox/repositories/OutboxRepository')

const EVENTS = require('../../../../core/shared/events/types')

const employeeTaskRepository = require('../repositories/employeeTaskRepository')



const ActionStrategyFactory = require('../../actions/ActionStrategyFactory')
const stageConfigRepository = require('../../repositories/stageConfigRepository')
const {
  normalizeActionPayload,
  resolveActionsForStage
} = require('../../actions/actionHelpers')
const { buildStoredFileEntry } = require('../../../../core/utils/filePath')
const {
  requiresDigitalSignature,
  verifySignatureForComplete,
  persistVerifiedSignature,
  buildTransactionSignatureLedger,
  appendSignatureToTransactionData
} = require('./transactionSigningService')
const securityGuardService = require('../../../../core/security/securityGuardService')
const {
  assertTaskLockHolder,
  releaseTaskLock
} = require('./taskLockService')

async function executeActions (actions, context) {
  const results = []

  for (const action of actions) {
    const strategy = ActionStrategyFactory.make(action.name)
    const actionPayload = normalizeActionPayload(action)

    const result = await strategy.execute({
      payload: actionPayload,
      context
    })

    results.push({
      name: action.name,
      ...actionPayload,
      result
    })
  }

  return results
}

async function runServiceTaskActions ({
  processInstance,
  transaction,
  transactionData,
  task,
  userId
}) {
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
    return transactionData
  }

  for (const taskKey of newServiceTaskKeys) {
    const serviceStage = await stageRepository.findByCodeAndProcess(
      processInstance.process_definition_id,
      taskKey
    )

    if (!serviceStage || serviceStage.type !== 'SERVICE_TASK') {
      executedServiceTasks.add(taskKey)
      continue
    }

    const stageConfig =
      await stageConfigRepository.findByStageId(serviceStage.id)

    const actions = resolveActionsForStage(serviceStage, stageConfig)

    if (!actions.length) {
      executedServiceTasks.add(taskKey)
      continue
    }

    const actionResults = await executeActions(actions, {
      task,
      transaction,
      processInstance,
      stage: serviceStage,
      userId
    })

    transactionData[serviceStage.code] = {
      ...(transactionData[serviceStage.code] || {}),
      actions: [
        ...(transactionData[serviceStage.code]?.actions || []),
        ...actionResults
      ],
      executed_at: new Date(),
      executed_by: 'system'
    }

    executedServiceTasks.add(taskKey)
  }

  transactionData._executedServiceTasks = [...executedServiceTasks]

  return transactionData
}

// ======================================================
// COMPLETE TASK
// ======================================================

async function completeTask ({
  taskId,
  userId,
  payload,
  clientMeta = {},
  isAutoComplete = false
}) {
  await securityGuardService.assertAccountNotLocked(userId)

  const idempotencyKey =
    clientMeta.idempotencyKey || payload?.idempotency_key || null

  let guardContext = null

  if (!isAutoComplete && idempotencyKey) {
    const replay = operationGuardService.getReplay({
      scope: 'complete_task',
      userId,
      idempotencyKey
    })

    if (replay) {
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
        return guardContext
      }
    })

    if (guardContext) {
      return operationGuardService.commit(guardContext, result)
    }

    return {
      ...result,
      idempotent_replay: false
    }
  } catch (error) {
    if (error.code === 'IDEMPOTENT_REPLAY') {
      return error.result
    }

    operationGuardService.release(guardContext)
    throw error
  }
}

function toPublicSignatureRecord (record) {
  if (!record) {
    return null
  }

  const {
    challenge,
    digitalSignature,
    userKey,
    signed_message: signedMessage,
    ...publicRecord
  } = record

  return publicRecord
}

function buildCompleteTaskResponseData ({
  stageName,
  stageSnapshot,
  payload,
  idempotencyKey
}) {
  const response = {
    stage_name: stageName,
    fields: stageSnapshot.fields,
    files: stageSnapshot.files,
    templates: stageSnapshot.templates,
    variables: payload.variables || {},
    decision: payload.decision || null,
    idempotency_key: idempotencyKey || payload.idempotency_key || null
  }

  if (payload.signature) {
    response.signature = {
      challenge_id: payload.signature.challenge_id,
      signature: payload.signature.signature
    }
  }

  return response
}

async function completeTaskCore ({
  taskId,
  userId,
  payload,
  clientMeta = {},
  isAutoComplete = false,
  idempotencyKey = null,
  acquireOperationGuard = null
}) {
  /**
   * ====================================================
   * SUPPORTED PAYLOAD
   * ====================================================
   *
   * {
   *   fields: [],
   *   files: [],
   *   templates: [],
   *   actions: [],
   *   variables: {}
   * }
   *
   * ----------------------------------------------------
   * variables:
   * ONLY FOR CAMUNDA GATEWAY ROUTING
   *
   * Example:
   *
   * {
   *   variables: {
   *     decision: 'over_50'
   *   }
   * }
   *
   * ----------------------------------------------------
   * actions:
   * - USER_TASK: body فقط (لا actions من الإعداد)
   * - SERVICE_TASK: stage_configs.config_json.actions (تنفَّذ تلقائياً)
   * }
   *
   * ====================================================
   */

  // ====================================================
  // GET TASK
  // ====================================================

  const task = await camundaClient.getTaskById(taskId)

  if (!task) {
    throw new Error('Task not found')
  }

  // ====================================================
  // GET PROCESS INSTANCE
  // ====================================================

  const processInstance = await processInstanceRepository.findByCamundaId(
    task.processInstanceId
  )

  if (!processInstance) {
    throw new Error('Process instance not found')
  }

  // ====================================================
  // GET TRANSACTION
  // ====================================================

  const transaction = await transactionClient.getTransactionById(
    processInstance.transaction_id
  )

  if (!transaction) {
    throw new Error('Transaction not found')
  }

  let currentVersion = payload.expected_version ?? transaction.version

  if (!isAutoComplete) {
    await assertTaskLockHolder({
      processInstanceId: processInstance.id,
      taskId: task.id,
      userId
    })
  }

  // ====================================================
  // GET CURRENT STAGE
  // ====================================================

  const stage = await stageRepository.findByCodeAndProcess(
    processInstance.process_definition_id,
    task.taskDefinitionKey
  )

  if (!stage) {
    throw new Error('Stage not found')
  }

  const stageConfig = await stageConfigRepository.findByStageId(stage.id)
  const needsSignature = requiresDigitalSignature(
    stage,
    payload,
    stageConfig,
    { isAutoComplete }
  )

  let signingRequest = null

  if (needsSignature) {
    const challengeId = payload.signature?.challenge_id
    const signature = payload.signature?.signature

    if (!signingId || !signature) {
      throw new Error(
        'Digital signature is required. Call POST /tasks/:taskId/signing-challenge first.'
      )
    }

    if (!payload.decision) {
      throw new Error(
        'decision is required when completing a task with digital signature'
      )
    }

    signingRequest = {
      challengeId,
      signature,
      decision: payload.decision
    }

    await verifySignatureForComplete({
      challengeId,
      signature,
      userId,
      decision: payload.decision,
      clientMeta
    })
  }

  // ====================================================
  // STAGE SNAPSHOT
  // ====================================================

  /**
   * THIS WILL BE SAVED INSIDE:
   *
   * transaction.data[stage.code]
   *
   * Example:
   *
   * {
   *   SUBMISSION_STAGE: {
   *     fields: [],
   *     files: [],
   *     templates: [],
   *     actions: []
   *   }
   * }
   */

  const stageSnapshot = {
    fields: [],
    files: [],
    templates: [],
    actions: []
  }

  // ====================================================
  // HANDLE FIELDS
  // ====================================================

  /**
   * Example:
   *
   * {
   *   name: 'citizen_name',
   *   value: 'روان سرحان'
   * }
   */

  if (Array.isArray(payload.fields)) {
    for (const field of payload.fields) {
      stageSnapshot.fields.push({
        name: field.name,

        value: field.value 
      })
    }
  }

  // ====================================================
  // HANDLE FILES
  // ====================================================

  /**
   * Example:
   *
   * {
   *   name: 'criminal_record',
   *   path: '/uploads/a.pdf'
   * }
   */

  if (Array.isArray(payload.files)) {
    for (const file of payload.files) {
      stageSnapshot.files.push(buildStoredFileEntry(file, userId))
    }
  }

  // ====================================================
  // HANDLE TEMPLATES
  // ====================================================

  /**
   * Example:
   *
   * {
   *   template_id: 1,
   *   values: {
   *     full_name: 'روان'
   *   }
   * }
   */

  if (Array.isArray(payload.templates)) {
    for (const template of payload.templates) {
      stageSnapshot.templates.push({
        template_id: template.template_id,

        values: template.values || {}
      })
    }
  }

  if (payload.variables && Object.keys(payload.variables).length) {
    stageSnapshot.variables = payload.variables
  }

  if (payload.decision) {
    stageSnapshot.decision = payload.decision
  }

  // ====================================================
  // HANDLE ACTIONS
  // ====================================================

  /**
   * Example:
   *
   * {
   *   name: 'SEND_EMAIL',
   *   to_organization_department_roles_id: 2,
   *   message: 'hello'
   * }
   *
   * or:
   *
   * {
   *   name: 'SEND_EMAIL',
   *   payload: {
   *     to_organization_department_roles_id: 2,
   *     message: 'hello'
   *   }
   * }
   *
   * ACTIONS != VARIABLES
   *
   * ACTIONS:
   * execute business logic
   *
   * VARIABLES:
   * route camunda gateway
   */

  if (Array.isArray(payload.actions) && payload.actions.length) {
    const actionResults = await executeActions(payload.actions, {
      task,
      transaction,
      processInstance,
      stage,
      userId
    })

    stageSnapshot.actions.push(...actionResults)
  } else if (stage.type === 'SERVICE_TASK') {
    const autoActions = resolveActionsForStage(stage, stageConfig)

    if (autoActions.length) {
      const actionResults = await executeActions(autoActions, {
        task,
        transaction,
        processInstance,
        stage,
        userId
      })

      stageSnapshot.actions.push(...actionResults)
    }
  }

  // ====================================================
  // MERGE INTO TRANSACTION DATA
  // ====================================================

  /**
   * FINAL RESULT:
   *
   * {
   *   SUBMISSION_STAGE: {},
   *   APPROVAL_STAGE: {}
   * }
   */

  // ====================================================
  // PREPARE CAMUNDA VARIABLES
  // ====================================================

  const variables = {}

  if (payload.variables) {
    Object.entries(payload.variables).forEach(([key, value]) => {
      variables[key] = {
        value
      }
    })
  }

  // ====================================================
  // COMPLETE TASK IN CAMUNDA (before any DB persist)
  // ====================================================

  await camundaClient.completeTask(task.id, variables)

  // ====================================================
  // PERSIST STAGE + SIGNATURE (only after Camunda succeeds)
  // ====================================================

  let digitalSignatureRecord = null

  if (signingRequest) {
    digitalSignatureRecord = await persistVerifiedSignature({
      challengeId: signingRequest.challengeId,
      signature: signingRequest.signature,
      userId,
      clientMeta
    })

    stageSnapshot.digital_signature =
      toPublicSignatureRecord(digitalSignatureRecord)
  }

  let transactionData = {
    ...(transaction.data || {})
  }

  transactionData[stage.code] = {
    ...stageSnapshot,
    completed_by: userId,
    completed_at: new Date()
  }

  if (digitalSignatureRecord) {
    appendSignatureToTransactionData(transactionData, digitalSignatureRecord)
  }

  transactionData = await runServiceTaskActions({
    processInstance,
    transaction,
    transactionData,
    task,
    userId
  })

  const updatedTransaction = await transactionClient.updateData(
    transaction.id,
    transactionData,
    currentVersion
  )

  currentVersion = updatedTransaction.version

  await outboxRepository.create({
    event_type: EVENTS.PROCESSINSTANCESTAGE_CREATED,

    payload: {
      transactionId: transaction.id,

      processInstanceId: processInstance.id,

      taskId: task.id,

      stageId: stage.id,

      stageCode: stage.code,

      stageName: stage.name,

      completedBy: userId,

      status: 'completed',

      data: transactionData[stage.code]
    }
  })

  // ====================================================
  // GET NEXT TASK
  // ====================================================

  const nextTasks = await camundaClient.getActiveTasks(
    processInstance.camunda_process_instance_id
  )

  const nextTask = nextTasks?.[0] || null

  // ====================================================
  // HANDLE NEXT STAGE
  // ====================================================

  if (nextTask) {
    const nextStage = await stageRepository.findByCodeAndProcess(
      processInstance.process_definition_id,
      nextTask.taskDefinitionKey
    )

    // ================================================
    // UPDATE PROCESS INSTANCE
    // ================================================

    await processInstanceRepository.update(processInstance.id, {
      current_stage_id: nextStage?.id || null,

      status: 'running'
    })
  } else {
    // ==================================================
    // WORKFLOW FINISHED
    // ==================================================

    await processInstanceRepository.update(processInstance.id, {
      status: 'completed',

      current_stage_id: null
    })

    await transactionClient.updateStatus(transaction.id, 'completed')

    transactionData._digital_signatures_ledger =
      await buildTransactionSignatureLedger(transaction.id)

    await transactionClient.updateData(
      transaction.id,
      transactionData,
      currentVersion
    )

    // ================================================
    // WORKFLOW COMPLETED EVENT
    // ================================================

    await outboxRepository.create({
      event_type: EVENTS.WORKFLOW_COMPLETED,

      payload: {
        transactionId: transaction.id,

        processInstanceId: processInstance.id
      }
    })
  }

  // ====================================================
  // RESPONSE
  // ====================================================

  if (!isAutoComplete) {
    await releaseTaskLock({
      processInstanceId: processInstance.id,
      taskId: task.id,
      userId
    })
  }

  return {
    message: 'Task completed successfully',

    data: {
      taskId: task.id,

      currentStage: stage.name,

      nextTask: nextTask?.name || null,

      workflowStatus: nextTask ? 'running' : 'completed',

      transactionData
    }
  }
}
////////////////////////////////////////////////////////////////////////////////


module.exports = {
  completeTask
}
