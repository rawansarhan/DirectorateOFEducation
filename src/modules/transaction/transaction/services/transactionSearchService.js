'use strict'

const transactionSearchRepository = require('../repositories/transactionSearchRepository')
const {
  validateTransactionSearchQuery
} = require('../validations/transactionSearchValidation')
const {
  TransactionSearchListItemDTO
} = require('../dto/TransactionSearchListItemDTO')
const {
  parseCursorPaginationQuery,
  buildCursorPaginationMeta,
  emptyCursorPaginatedResult,
  encodeCursor
} = require('../../../../core/utils/pagination')
const { retryWithBackoff } = require('../../../../core/utils/retryWithBackoff')
const { createTransactionError } = require('../utils/transactionErrors')

function buildTransactionCursor (row) {
  const plain = row && typeof row.get === 'function' ? row.get({ plain: true }) : row
  const createdAt = plain.created_at
    ? new Date(plain.created_at).toISOString()
    : null

  if (!createdAt || !Number.isFinite(Number(plain.id))) {
    return null
  }

  return encodeCursor({
    k: 'txn',
    t: createdAt,
    id: Number(plain.id)
  })
}

async function searchTransactions (query = {}) {
  const { error, value: filters } = validateTransactionSearchQuery(query)

  if (error) {
    throw createTransactionError('VALIDATION_ERROR', error)
  }

  let limit
  let cursor
  let decodedCursor

  try {
    ;({ limit, cursor, decodedCursor } = parseCursorPaginationQuery(query, {
      defaultLimit: 20
    }))
  } catch (err) {
    throw createTransactionError('VALIDATION_ERROR', err.message)
  }

  if (decodedCursor && decodedCursor.k !== 'txn') {
    throw createTransactionError('VALIDATION_ERROR', 'cursor غير صالح لهذا البحث')
  }

  const { rows, hasNext } = await retryWithBackoff(
    () =>
      transactionSearchRepository.searchWithCursor(filters, {
        limit,
        cursor: decodedCursor
      }),
    { label: 'transaction.searchWithCursor' }
  )

  if (!rows.length) {
    return {
      message: 'تم جلب نتائج البحث بنجاح',
      data: {
        ...emptyCursorPaginatedResult({ limit, cursor }),
        filters_applied: buildFiltersApplied(filters)
      }
    }
  }

  const nextCursor = hasNext ? buildTransactionCursor(rows[rows.length - 1]) : null

  return {
    message: 'تم جلب نتائج البحث بنجاح',
    data: {
      items: rows.map(row => new TransactionSearchListItemDTO(row)),
      pagination: buildCursorPaginationMeta({
        limit,
        cursor,
        nextCursor,
        hasNext
      }),
      filters_applied: buildFiltersApplied(filters)
    }
  }
}

function buildFiltersApplied (filters) {
  return {
    q: filters.q || null,
    status: filters.status || null,
    statuses: filters.statuses || null,
    process_name: filters.process_name || null,
    type_doc_id: filters.type_doc_id || null,
    type_doc_ids: filters.type_doc_ids || null,
    has_final_document:
      filters.has_final_document == null ? null : filters.has_final_document,
    from_date: filters.from_date || null,
    to_date: filters.to_date || null
  }
}

module.exports = {
  searchTransactions
}
