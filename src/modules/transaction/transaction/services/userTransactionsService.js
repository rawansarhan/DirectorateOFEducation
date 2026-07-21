'use strict'

const repo = require('../repositories/transactionRepository')
const {
  processRepository,
  employeeTaskRepository,
  calculateProgressPercent
} = require('../../../workflow/public')
const { UserTransactionListItemDTO } = require('../dto/UserTransactionListItemDTO')
const { createTransactionError, MESSAGES } = require('../utils/transactionErrors')
const {
  emptyPaginatedResult,
  buildPaginationMeta
} = require('../../../../core/utils/pagination')
const { retryWithBackoff } = require('../../../../core/utils/retryWithBackoff')

function parseStatusFilter (rawStatus) {
  if (rawStatus == null || String(rawStatus).trim() === '') {
    return null
  }

  const status = String(rawStatus).trim()

  if (!repo.VALID_USER_LIST_STATUSES.includes(status)) {
    throw createTransactionError(
      'VALIDATION_ERROR',
      `status غير صالح — القيم المسموحة: ${repo.VALID_USER_LIST_STATUSES.join(', ')}`
    )
  }

  return status
}

function resolveProgressPercent (transaction, completedStages, totalStages) {
  if (transaction.status === 'draft') {
    return 0
  }

  if (transaction.status === 'completed') {
    return 100
  }

  return calculateProgressPercent(completedStages, totalStages)
}

async function resolveProcessNamesForDrafts (transactions = []) {
  const codes = [
    ...new Set(
      transactions
        .filter(tx => !tx.process_instance?.process_definition?.name && tx.code)
        .map(tx => tx.code)
    )
  ]

  if (!codes.length) {
    return new Map()
  }

  const nameMap = new Map()

  await Promise.all(
    codes.map(async (code) => {
      const process = await retryWithBackoff(
        () => processRepository.findByCode(code),
        { label: `process.findByCode:${code}` }
      )

      if (process) {
        nameMap.set(code, {
          name: process.name || null,
          priority: process.priority ?? 0,
          is_complaint: Boolean(process.is_complaint)
        })
      }
    })
  )

  return nameMap
}

function mapTransactionRow ({
  transaction,
  stageNameMap,
  stageCountMap,
  completedStageCountMap,
  draftProcessNameMap
}) {
  const processInstance = transaction.process_instance
  const processDefinition = processInstance?.process_definition
  const draftMeta = transaction.code
    ? draftProcessNameMap.get(transaction.code)
    : null

  const processDefinitionName =
    processDefinition?.name ||
    draftMeta?.name ||
    null

  const priority =
    processDefinition?.priority ??
    draftMeta?.priority ??
    0

  const isComplaint =
    processDefinition?.is_complaint ??
    draftMeta?.is_complaint ??
    false

  const processDefinitionId = processInstance?.process_definition_id
  const totalStages = processDefinitionId
    ? stageCountMap.get(processDefinitionId) || 0
    : 0
  const completedStages = completedStageCountMap.get(transaction.id) || 0

  const stageName =
    processInstance?.current_stage?.name ||
    stageNameMap.get(transaction.id) ||
    null

  const progressPercent = resolveProgressPercent(
    transaction,
    completedStages,
    totalStages
  )

  return new UserTransactionListItemDTO({
    transaction,
    processDefinitionName,
    stageName,
    progressPercent,
    priority,
    isComplaint
  })
}

async function getMyTransactions ({
  userId,
  page,
  limit,
  offset,
  statusFilter = null
}) {
  const status = parseStatusFilter(statusFilter)

  const { rows, count } = await retryWithBackoff(
    () =>
      repo.findAndCountByUserId({
        userId,
        status,
        limit,
        offset
      }),
    { label: 'transaction.findAndCountByUserId' }
  )

  if (!rows.length) {
    return {
      message: MESSAGES.TRANSACTIONS_LIST_RETRIEVED,
      data: emptyPaginatedResult({ page, limit })
    }
  }

  const transactionIds = rows.map(row => row.id)
  const processDefinitionIds = [
    ...new Set(
      rows
        .map(row => row.process_instance?.process_definition_id)
        .filter(Boolean)
    )
  ]

  const [
    stageCountMap,
    completedStageCountMap,
    stageNameMap,
    draftProcessNameMap
  ] = await Promise.all([
    employeeTaskRepository.countStagesByProcessDefinitionIds(processDefinitionIds),
    employeeTaskRepository.countCompletedStagesByTransactionIds(transactionIds),
    employeeTaskRepository.getLatestStageNamesByTransactionIds(
      rows
        .filter(row => !row.process_instance?.current_stage?.name)
        .map(row => row.id)
    ),
    resolveProcessNamesForDrafts(rows)
  ])

  const items = rows.map(transaction =>
    mapTransactionRow({
      transaction,
      stageNameMap,
      stageCountMap,
      completedStageCountMap,
      draftProcessNameMap
    })
  )

  return {
    message: MESSAGES.TRANSACTIONS_LIST_RETRIEVED,
    data: {
      items,
      pagination: buildPaginationMeta({ page, limit, total: count })
    }
  }
}

function buildStatusCountMap (rows = []) {
  const map = {}

  for (const row of rows) {
    map[row.status] = Number(row.count) || 0
  }

  return map
}

async function getMyTransactionCounts ({ userId }) {
  const rows = await retryWithBackoff(
    () => repo.countByUserIdGroupByStatus(userId),
    { label: 'transaction.countByUserIdGroupByStatus' }
  )

  const statusMap = buildStatusCountMap(rows)
  const completed = statusMap.completed || 0
  const inProgress =
    (statusMap.submitted || 0) + (statusMap.in_progress || 0)

  return {
    message: MESSAGES.TRANSACTION_COUNTS_RETRIEVED,
    data: {
      completed,
      in_progress: inProgress,
      total: completed + inProgress
    }
  }
}

module.exports = {
  getMyTransactions,
  getMyTransactionCounts
}
