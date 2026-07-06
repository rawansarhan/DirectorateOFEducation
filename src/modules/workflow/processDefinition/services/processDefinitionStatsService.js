'use strict'

const processDefinitionStatsRepository = require('../repositories/processDefinitionStatsRepository')
const { parseDateRange } = require('../../taskCamunda/services/getAllTasksService')
const {
  KEYS,
  getOrLoad
} = require('../../../../core/cache/apiCacheService')
const { API_CACHE_TTL_SECONDS } = require('../../../../core/config/env')

const EMPTY_TRANSACTION_COUNTS = Object.freeze({
  pending_pickup: 0,
  in_progress: 0,
  completed: 0,
  rejected: 0
})

function formatDateOnly (date) {
  if (!date) {
    return null
  }

  return date.toISOString().slice(0, 10)
}

function buildPeriodMeta ({ fromDate, toDate }) {
  return {
    from_date: formatDateOnly(fromDate),
    to_date: formatDateOnly(toDate)
  }
}

/** كاش ثابت: قائمة كل process definitions + type_trans */
async function loadCachedProcessDefinitions () {
  return getOrLoad(
    KEYS.processDefinitionsWithType(),
    () => processDefinitionStatsRepository.findAllProcessDefinitionsWithType(),
    {
      label: 'process-definitions:with-type',
      ttlSeconds: API_CACHE_TTL_SECONDS
    }
  )
}

/** كاش ثابت: الدوائر المرتبطة بعملية واحدة عبر stage_assignments */
async function loadCachedProcessDepartments (processDefinitionId) {
  return getOrLoad(
    KEYS.processDefinitionDepartments(processDefinitionId),
    () =>
      processDefinitionStatsRepository.findDepartmentsByProcessDefinitionId(
        processDefinitionId
      ),
    {
      label: `process-departments:${processDefinitionId}`,
      ttlSeconds: API_CACHE_TTL_SECONDS
    }
  )
}

function hasTransactionsInPeriod (counts) {
  if (!counts) {
    return false
  }

  return (
    counts.pending_pickup +
    counts.in_progress +
    counts.completed +
    counts.rejected
  ) > 0
}

function shapeProcessDefinitionStats ({
  processDefinition,
  transactionCounts,
  departments
}) {
  const plain =
    processDefinition && typeof processDefinition.get === 'function'
      ? processDefinition.get({ plain: true })
      : processDefinition

  const counts = transactionCounts || EMPTY_TRANSACTION_COUNTS

  return {
    process_definition_id: plain.id,
    process_name: plain.name,
    process_code: plain.code,
    transaction_type_name: plain.type_trans?.name ?? null,
    transaction_type_code: plain.type_trans?.code ?? null,
    is_active: plain.is_active,
    approval_status: plain.approval_status,
    transactions: {
      pending_pickup: counts.pending_pickup,
      in_progress: counts.in_progress,
      completed: counts.completed,
      rejected: counts.rejected
    },
    departments
  }
}
// بناء قائمة الاحصائيات المرتبطة بالمعاملة 
async function buildProcessDefinitionStatsList ({ fromDate, toDate }) {
  const [processDefinitions, transactionCountMap] = await Promise.all([
    loadCachedProcessDefinitions(),
    processDefinitionStatsRepository.countTransactionsGroupedByProcessDefinition({
      fromDate,
      toDate
    })
  ])

  const items = (
    await Promise.all(
      processDefinitions.map(async processDefinition => {
        const transactionCounts = transactionCountMap.get(processDefinition.id)

        if (!hasTransactionsInPeriod(transactionCounts)) {
          return null
        }

        const departments = await loadCachedProcessDepartments(processDefinition.id)

        return shapeProcessDefinitionStats({
          processDefinition,
          transactionCounts,
          departments
        })
      })
    )
  ).filter(Boolean)

  return {
    items,
    period: buildPeriodMeta({ fromDate, toDate })
  }
}
// الدالة الرئيسية المسؤولة عن جلب جميع الاحصائيات المرتبطة ب process 
async function getAllProcessDefinitionStatsService ({ query = {} } = {}) {
  const { fromDate, toDate } = parseDateRange({ query })

  const data = await buildProcessDefinitionStatsList({ fromDate, toDate })

  return {
    message: 'تم جلب إحصائيات العمليات بنجاح',
    data
  }
}

module.exports = {
  getAllProcessDefinitionStatsService
}
