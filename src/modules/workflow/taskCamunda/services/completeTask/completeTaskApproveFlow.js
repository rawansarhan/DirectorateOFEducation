'use strict'

const camundaClient = require('../../../../../core/shared/clients/camunda/camundaClient')
const processInstanceRepository = require('../../repositories/processInstanceRepository')
const employeeTaskRepository = require('../../repositories/employeeTaskRepository')
const stageRepository = require('../../../processDefinition/repositories/stageRepository')
const {
  transactionRepository,
  assessFinalDocumentReadiness,
  assertReadyForWorkflowCompletion
} = require('../../../../transaction/public')
const {
  buildTransactionSignatureLedger
} = require('../transactionSigningService')
const {
  routeNextUserTaskAssignments
} = require('../taskAssignmentRoutingService')
const {
  invalidateEmployeeTasksForUser
} = require('../../../../../core/cache/apiCacheService')
const {
  scheduleNotifyTechnicalOfficersIfNoAssigneeStaff
} = require('../../../../notification/services/missingAssigneeStaffNotificationService')
const {
  withDbTransaction,
  logStep
} = require('./completeTaskHelpers')

function isUserTaskStage (stage) {
  return !stage?.type || stage.type === 'USER_TASK'
}

async function resolveTaskStagePairs ({
  processDefinitionId,
  tasks = []
}) {
  const pairs = []

  for (const task of tasks) {
    const stage = await stageRepository.findByCodeAndProcess(
      processDefinitionId,
      task.taskDefinitionKey
    )

    pairs.push({ task, stage })
  }

  return pairs
}

async function routeAssignmentsForTasks ({
  taskStagePairs = [],
  transactionData,
  overrideTarget = null,
  applyOverrideOnce = true
}) {
  const routedAssignments = []
  let overrideApplied = false

  for (const { task, stage } of taskStagePairs) {
    if (!isUserTaskStage(stage)) {
      continue
    }

    const routingResult = await routeNextUserTaskAssignments({
      nextTask: task,
      nextStage: stage,
      transactionData,
      overrideTarget:
        applyOverrideOnce && !overrideApplied ? overrideTarget : null
    })

    if (applyOverrideOnce && overrideTarget && routingResult.routed) {
      overrideApplied = true
    }

    if (routingResult.assignments?.length) {
      routedAssignments.push(...routingResult.assignments)
    }
  }

  return routedAssignments
}

async function invalidateUsersForAssignments (assignments = [], userId = null) {
  const userIds = new Set([userId].filter(Boolean))

  if (assignments.length) {
    const routedUserIds = await employeeTaskRepository.getUserIdsForOrgDeptRoleIds(
      assignments.map(item => item.organization_department_roles_id)
    )

    for (const routedUserId of routedUserIds) {
      userIds.add(routedUserId)
    }
  }

  for (const affectedUserId of userIds) {
    invalidateEmployeeTasksForUser(affectedUserId).catch(() => {})
  }
}

async function runApproveFlow ({
  processInstance,
  transaction,
  transactionData,
  currentVersion,
  overrideTarget = null,
  userId = null,
  sequelize,
  dbTransaction = null
}) {
  logStep('PHASE_17_APPROVE_FLOW_START')

  const nextTasks = await camundaClient.getActiveTasks(
    processInstance.camunda_process_instance_id
  )

  let nextVersion = currentVersion
  let nextStageId = null
  let workflowStatus = 'running'

  if (nextTasks.length) {
    const taskStagePairs = await resolveTaskStagePairs({
      processDefinitionId: processInstance.process_definition_id,
      tasks: nextTasks
    })

    const userTaskPairs = taskStagePairs.filter(({ stage }) =>
      isUserTaskStage(stage)
    )
    const representative =
      userTaskPairs[0] || taskStagePairs[0] || null

    await processInstanceRepository.update(processInstance.id, {
      current_stage_id: representative?.stage?.id || null,
      status: 'running'
    }, dbTransaction)

    nextStageId = representative?.stage?.id || null

    const routedAssignments = await routeAssignmentsForTasks({
      taskStagePairs: userTaskPairs.length ? userTaskPairs : taskStagePairs,
      transactionData,
      overrideTarget,
      applyOverrideOnce: true
    })

    await withDbTransaction(sequelize, dbTransaction, async (dbTx) => {
      const updatedTransaction = await transactionRepository.updateDataOptimistic(
        transaction.id,
        transactionData,
        nextVersion,
        dbTx
      )
      nextVersion = updatedTransaction.version
    })

    await invalidateUsersForAssignments(routedAssignments, userId)

    const activeStageIds = taskStagePairs
      .map(({ stage }) => stage?.id)
      .filter(Boolean)

    if (activeStageIds.length) {
      const stageUserIds =
        await employeeTaskRepository.getUserIdsForStageIds(activeStageIds)

      for (const affectedUserId of stageUserIds) {
        invalidateEmployeeTasksForUser(affectedUserId).catch(() => {})
      }
    }

    if (routedAssignments.length) {
      scheduleNotifyTechnicalOfficersIfNoAssigneeStaff({
        targets: routedAssignments,
        nextStage: representative?.stage || null,
        transaction,
        processInstance,
        processDefinitionId: processInstance.process_definition_id,
        sentByUserId: userId
      })
    }

    logStep('APPROVE_ADVANCED', {
      activeTaskCount: nextTasks.length,
      parallelUserTaskCount: userTaskPairs.length,
      nextTaskIds: nextTasks.map(task => task.id),
      nextStageCode: representative?.stage?.code || '',
      nextStageType: representative?.stage?.type || '',
      workflowStatus: 'running',
      routedOverride: Boolean(overrideTarget),
      routedAssignmentCount: routedAssignments.length
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
        nextVersion,
        dbTx
      )
    })

    workflowStatus = 'completed'

    logStep('WORKFLOW_COMPLETED', {
      transactionId: transaction.id,
      processInstanceId: processInstance.id
    })

    // الوثيقة النهائية تُولَّد يدوياً عبر GET final-document مع اختيار الملفات
  }

  return {
    workflowStatus,
    nextStageId,
    currentVersion: nextVersion,
    transactionData
  }
}

module.exports = {
  runApproveFlow
}
