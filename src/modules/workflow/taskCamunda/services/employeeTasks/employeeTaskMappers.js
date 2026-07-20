'use strict'

const { toEmployeeTaskItem } = require('../../mappers/employeeTaskMapper')
const {
  encodeCursor
} = require('../../../../../core/utils/pagination')
const {
  resolveEmployeeTaskStatus,
  calculateProgressPercent,
  buildApplicantName
} = require('../../utils/employeeTaskStatus')
const {
  normalizeProcessPriority,
  formatTransactionDate
} = require('../../utils/employeeTaskFormatters')
const employeeTaskRepository = require('../../repositories/employeeTaskRepository')

function resolveStageStatusLabel (status) {
  if (status === 'rejected') {
    return 'مرفوض'
  }

  if (status === 'completed') {
    return 'منجز'
  }

  return status
}

function parseItemActivityAt (item) {
  if (item?.activity_at) {
    return new Date(item.activity_at).getTime()
  }

  if (item?.completed_at) {
    return new Date(item.completed_at).getTime()
  }

  return 0
}

function mergeTaskItemsByActivity ({
  activeItems = [],
  completedItems = [],
  rejectedItems = []
}) {
  return [
    ...activeItems.map(item => ({ item, sortAt: parseItemActivityAt(item) })),
    ...completedItems.map(item => ({ item, sortAt: parseItemActivityAt(item) })),
    ...rejectedItems.map(item => ({ item, sortAt: parseItemActivityAt(item) }))
  ].sort((a, b) => b.sortAt - a.sortAt)
}

async function buildProgressMaps (instances = []) {
  const transactionIds = instances
    .map(instance => instance.transaction?.id)
    .filter(Boolean)

  const processDefinitionIds = [
    ...new Set(instances.map(instance => instance.process_definition_id))
  ]

  const [stageCountMap, completedStageCountMap] = await Promise.all([
    employeeTaskRepository.countStagesByProcessDefinitionIds(
      processDefinitionIds
    ),
    employeeTaskRepository.countCompletedStagesByTransactionIds(
      transactionIds
    )
  ])

  return { stageCountMap, completedStageCountMap }
}

async function buildStageNameMap (instances = []) {
  const missingTransactionIds = instances
    .filter(instance => !instance.current_stage?.name && instance.transaction?.id)
    .map(instance => instance.transaction.id)

  if (!missingTransactionIds.length) {
    return new Map()
  }

  return employeeTaskRepository.getLatestStageNamesByTransactionIds(
    missingTransactionIds
  )
}

function resolveStageName (instance, activeTask, stageNameMap) {
  return (
    instance.current_stage?.name ||
    activeTask?.name ||
    stageNameMap.get(instance.transaction?.id) ||
    null
  )
}

function mapInstanceToTask ({
  instance,
  activeTask,
  userId,
  stageCountMap,
  completedStageCountMap,
  stageNameMap = new Map()
}) {
  const transaction = instance.transaction
  const totalStages = stageCountMap.get(instance.process_definition_id) || 0
  const completedStages = completedStageCountMap.get(transaction?.id) || 0
  const progressPercent = calculateProgressPercent(
    completedStages,
    totalStages
  )

  const employeeStatus = resolveEmployeeTaskStatus({
    transaction,
    processInstance: instance,
    activeTask,
    userId
  })

  return toEmployeeTaskItem({
    processInstance: instance,
    activeTask,
    userId,
    progressPercent,
    employeeStatus,
    stageNameOverride: resolveStageName(instance, activeTask, stageNameMap)
  })
}

function sortActiveInstances (instances = []) {
  return [...instances].sort((a, b) => {
    const priorityA = normalizeProcessPriority(a.process_definition?.priority)
    const priorityB = normalizeProcessPriority(b.process_definition?.priority)

    if (priorityA !== priorityB) {
      return priorityA - priorityB
    }

    const dateA = new Date(a.transaction?.created_at || a.created_at)
    const dateB = new Date(b.transaction?.created_at || b.created_at)

    return dateA - dateB
  })
}

function isActivePairAfterCursor (pair, cursor) {
  const priority = normalizeProcessPriority(pair.instance.process_definition?.priority)
  const createdAt = new Date(
    pair.instance.transaction?.created_at || pair.instance.created_at
  )
  const id = pair.instance.id
  const cursorTime = new Date(cursor.t).getTime()

  if (priority > cursor.p) {
    return true
  }

  if (priority < cursor.p) {
    return false
  }

  if (createdAt.getTime() > cursorTime) {
    return true
  }

  if (createdAt.getTime() < cursorTime) {
    return false
  }

  return id > cursor.id
}

function buildActiveTaskCursor (pair) {
  return encodeCursor({
    k: 'active',
    p: normalizeProcessPriority(pair.instance.process_definition?.priority),
    t: new Date(
      pair.instance.transaction?.created_at || pair.instance.created_at
    ).toISOString(),
    id: pair.instance.id
  })
}

function buildUserStageCursor (row) {
  return encodeCursor({
    k: 'stage',
    t: new Date(row.created_at).toISOString(),
    id: row.id
  })
}

function buildTerminalInstanceCursor (instance) {
  return encodeCursor({
    k: 'task',
    p: normalizeProcessPriority(instance.process_definition?.priority),
    t: new Date(instance.transaction.created_at).toISOString(),
    id: instance.id
  })
}

function mapUserStageToItem (row) {
  const transaction = row.transaction
  const user = transaction?.user
  const processInstance = transaction?.process_instance
  const processDefinition = processInstance?.process_definition
  const typeTrans = processDefinition?.type_trans
  const stageData = row.data || {}
  const decision = stageData.decision ?? stageData.value ?? null

  return {
    transaction_id: transaction?.id ?? null,
    transaction_number: transaction?.id_process ?? null,
    type: typeTrans?.name ?? processDefinition?.name ?? null,
    type_code: typeTrans?.code ?? null,
    applicant_name: buildApplicantName(transaction, user),
    process_name: processDefinition?.name ?? null,
    date: formatTransactionDate(transaction?.created_at),
    stage_code: row.stage_code ?? null,
    stage_name: row.stage_name ?? null,
    status: row.status,
    status_label: resolveStageStatusLabel(row.status),
    decision,
    transaction_status: transaction?.status ?? null,
    completed_at: formatTransactionDate(row.created_at),
    activity_at: row.created_at ?? null
  }
}

module.exports = {
  resolveStageStatusLabel,
  parseItemActivityAt,
  mergeTaskItemsByActivity,
  buildProgressMaps,
  buildStageNameMap,
  resolveStageName,
  mapInstanceToTask,
  sortActiveInstances,
  isActivePairAfterCursor,
  buildActiveTaskCursor,
  buildUserStageCursor,
  buildTerminalInstanceCursor,
  mapUserStageToItem
}
