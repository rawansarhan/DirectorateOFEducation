'use strict'

const processDefinitionStatsRepository = require('../repositories/processDefinitionStatsRepository')
const { parseDateRange } = require('../../taskCamunda/services/getAllTasksService')
const {
  KEYS,
  getOrLoad
} = require('../../../../core/cache/apiCacheService')
const { API_CACHE_TTL_SECONDS } = require('../../../../core/config/env')
const { arabicIncludes } = require('../../../../core/utils/escapeLike')
const {
  parseCursorPaginationQuery,
  encodeCursor,
  buildCursorPaginationMeta,
  emptyCursorPaginatedResult
} = require('../../../../core/utils/pagination')

const EMPTY_TRANSACTION_COUNTS = Object.freeze({
  pending_pickup: 0,
  in_progress: 0,
  completed: 0,
  rejected: 0
})

function fail (message, statusCode = 400, code = 'VALIDATION_ERROR') {
  const err = new Error(message)
  err.statusCode = statusCode
  err.code = code
  return err
}

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

function parseSearchTerm (query = {}) {
  const raw = String(query.q ?? query.search ?? '').trim()
  return raw.length ? raw.slice(0, 100) : null
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

function matchesProcessStatsSearch (item, search) {
  if (!search) {
    return true
  }

  const haystacks = [
    item.process_name,
    item.process_code,
    item.transaction_type_name,
    item.transaction_type_code,
    String(item.process_definition_id),
    ...(item.departments || []).map(dept => dept?.name)
  ]

  return haystacks.some(text => arabicIncludes(text, search))
}

function applyCursorPage (items, { limit, cursorId = null }) {
  let filtered = items

  if (cursorId != null && Number.isFinite(Number(cursorId))) {
    const id = Number(cursorId)
    filtered = filtered.filter(item => item.process_definition_id > id)
  }

  const hasNext = filtered.length > limit
  const pageItems = hasNext ? filtered.slice(0, limit) : filtered

  return { pageItems, hasNext }
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
  const search = parseSearchTerm(query)

  const { limit, cursor, decodedCursor } = parseCursorPaginationQuery(query, {
    defaultLimit: 20
  })

  if (decodedCursor && decodedCursor.k !== 'process_stats') {
    throw fail('cursor غير صالح لهذا البحث')
  }

  const built = await buildProcessDefinitionStatsList({ fromDate, toDate })

  let items = built.items.filter(item => matchesProcessStatsSearch(item, search))

  items.sort((a, b) => a.process_definition_id - b.process_definition_id)

  if (!items.length) {
    return {
      message: 'تم جلب إحصائيات العمليات بنجاح',
      data: {
        ...emptyCursorPaginatedResult({ limit, cursor }),
        period: built.period
      }
    }
  }

  const { pageItems, hasNext } = applyCursorPage(items, {
    limit,
    cursorId: decodedCursor?.id ?? null
  })

  const last = pageItems[pageItems.length - 1]
  const nextCursor =
    hasNext && last
      ? encodeCursor({ k: 'process_stats', id: Number(last.process_definition_id) })
      : null

  return {
    message: 'تم جلب إحصائيات العمليات بنجاح',
    data: {
      items: pageItems,
      period: built.period,
      pagination: buildCursorPaginationMeta({
        limit,
        cursor,
        nextCursor,
        hasNext
      })
    }
  }
}

module.exports = {
  getAllProcessDefinitionStatsService
}
