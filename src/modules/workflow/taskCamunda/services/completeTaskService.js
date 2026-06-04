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
  resolveActionsFromStageConfig
} = require('../../actions/actionHelpers')
const { buildStoredFileEntry } = require('../../../../core/utils/filePath')
const {
  requiresDigitalSignature,
  verifyAndPersistSignature,
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

    const actions = resolveActionsFromStageConfig(stageConfig?.config_json)

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
   *     action: 'approve'
   *   }
   * }
   *
   * ----------------------------------------------------
   * actions:
   * BUSINESS / SERVICE EXECUTION
   *
   * Example:
   *
   * {
   *   actions: [
   *     {
   *       name: 'SEND_Not',
   *       payload: {
   *         to: 'x@gmail.com'
   *       }
   *     }
   *   ]
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
  let digitalSignatureRecord = null

  if (requiresDigitalSignature(stage, payload, stageConfig, { isAutoComplete })) {
    const signingId = payload.signature?.signing_id
    const signature = payload.signature?.signature

    if (!signingId || !signature) {
      throw new Error(
        'Digital signature is required. Call POST /tasks/:taskId/signing-challenge first.'
      )
    }

    digitalSignatureRecord = await verifyAndPersistSignature({
      signingId,
      signature,
      userId,
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

  if (digitalSignatureRecord) {
    stageSnapshot.digital_signature = digitalSignatureRecord
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
    const autoActions = resolveActionsFromStageConfig(stageConfig?.config_json)

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

  let transactionData = {
    ...(transaction.data || {})
  }

  // ====================================================
  // SAVE STAGE SNAPSHOT UNDER STAGE CODE
  // ====================================================

  transactionData[stage.code] = {
    ...(transactionData[stage.code] || {}),
    ...stageSnapshot,
    completed_by: userId,
    completed_at: new Date()
  }

  if (digitalSignatureRecord) {
    appendSignatureToTransactionData(transactionData, digitalSignatureRecord)
  }

  // ====================================================
  // UPDATE TRANSACTION DATA
  // ====================================================

  const updatedTransaction = await transactionClient.updateData(
    transaction.id,
    transactionData,
    currentVersion
  )

  currentVersion = updatedTransaction.version

  // ====================================================
  // SAVE STAGE EVENT
  // ====================================================

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
  // PREPARE CAMUNDA VARIABLES
  // ====================================================

  /**
   * Example:
   *
   * {
   *   variables: {
   *     action: 'approve'
   *   }
   * }
   */

  const variables = {}

  if (payload.variables) {
    Object.entries(payload.variables).forEach(([key, value]) => {
      variables[key] = {
        value
      }
    })
  }

  // ====================================================
  // COMPLETE TASK IN CAMUNDA
  // ====================================================

  await camundaClient.completeTask(task.id, variables)

  transactionData = await runServiceTaskActions({
    processInstance,
    transaction,
    transactionData,
    task,
    userId
  })

  if (transactionData._executedServiceTasks?.length) {
    const serviceTaskUpdate = await transactionClient.updateData(
      transaction.id,
      transactionData,
      currentVersion
    )

    currentVersion = serviceTaskUpdate.version
  }

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
