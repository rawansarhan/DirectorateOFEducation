'use strict'

const camundaClient = require('../../../../../core/shared/clients/camunda/camundaClient')
const processInstanceRepository = require('../../repositories/processInstanceRepository')
const employeeTaskRepository = require('../../repositories/employeeTaskRepository')
const stageRepository = require('../../../processDefinition/repositories/stageRepository')
const transactionRepository =
  require('../../../../transaction/transaction/repositories/transactionRepository')
const {
  buildTransactionSignatureLedger
} = require('../transactionSigningService')
const {
  assessFinalDocumentReadiness,
  assertReadyForWorkflowCompletion
} = require('../../../../transaction/certificate/services/finalDocumentReadinessService')
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
  scheduleFinalDocumentAutoGeneration,
  withDbTransaction,
  logStep
} = require('./completeTaskHelpers')

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

  const nextTask = nextTasks?.[0] || null
  let nextVersion = currentVersion
  let nextStageId = null
  let workflowStatus = 'running'

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

    const routingResult = await routeNextUserTaskAssignments({
      nextTask,
      nextStage,
      transactionData,
      overrideTarget
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

    if (routingResult.assignments?.length) {
      const routedUserIds = await employeeTaskRepository.getUserIdsForOrgDeptRoleIds(
        routingResult.assignments.map(item => item.organization_department_roles_id)
      )

      for (const routedUserId of routedUserIds) {
        invalidateEmployeeTasksForUser(routedUserId).catch(() => {})
      }

      if (routingResult.routed) {
        scheduleNotifyTechnicalOfficersIfNoAssigneeStaff({
          targets: routingResult.assignments,
          nextStage,
          transaction,
          processInstance,
          processDefinitionId: processInstance.process_definition_id,
          sentByUserId: userId
        })
      }
    }

    logStep('APPROVE_ADVANCED', {
      nextTaskId: nextTask.id,
      nextStageCode: nextStage?.code || '',
      nextStageType: nextStage?.type || '',
      workflowStatus: 'running',
      routedOverride: Boolean(overrideTarget),
      routedPending: Boolean(routingResult.pending),
      routedAssignmentCount: routingResult.assignments?.length || 0
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

    scheduleFinalDocumentAutoGeneration(transaction.id)
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
