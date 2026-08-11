'use strict'

const processSearchRepository = require('../repositories/processSearchRepository')
const {
  validateProcessSearchQuery,
  validateEmployeeOrgProcessSearchQuery
} = require('../validations/processSearchValidation')
const {
  parseCursorPaginationQuery,
  buildCursorPaginationMeta,
  emptyCursorPaginatedResult,
  encodeCursor
} = require('../../../../core/utils/pagination')
const { createHttpError, HTTP_STATUS } = require('../../../../core/middleware/httpStatusCodes')

function toItem (row) {
  const plain = row && typeof row.get === 'function' ? row.get({ plain: true }) : row

  return {
    id: plain.id,
    name: plain.name,
    code: plain.code ?? null,
    camunda_process_key: plain.camunda_process_key ?? null,
    priority: plain.priority ?? null,
    is_active: Boolean(plain.is_active),
    approval_status: plain.approval_status,
    is_complaint: Boolean(plain.is_complaint),
    type_trans_id: plain.type_trans_id ?? null,
    type_trans_name: plain.type_trans?.name ?? null,
    organization_id: plain.organization_id ?? null,
    organization_name: plain.organization?.name ?? null,
    created_at: plain.created_at,
    updated_at: plain.updated_at
  }
}

function buildProcessCursor (row) {
  const plain = row && typeof row.get === 'function' ? row.get({ plain: true }) : row
  if (typeof plain.name !== 'string' || !Number.isFinite(Number(plain.id))) {
    return null
  }

  return encodeCursor({
    k: 'proc',
    n: plain.name,
    id: Number(plain.id)
  })
}

async function runProcessSearch (filters, query) {
  const { limit, cursor, decodedCursor } = parseCursorPaginationQuery(query, {
    defaultLimit: 20
  })

  if (decodedCursor && decodedCursor.k !== 'proc') {
    throw createHttpError(
      'cursor غير صالح لهذا البحث',
      HTTP_STATUS.BAD_REQUEST,
      'VALIDATION_ERROR'
    )
  }

  const { rows, hasNext } = await processSearchRepository.searchWithCursor(filters, {
    limit,
    cursor: decodedCursor
  })

  if (!rows.length) {
    return {
      message: 'تم جلب نتائج البحث بنجاح',
      data: emptyCursorPaginatedResult({ limit, cursor })
    }
  }

  const nextCursor = hasNext ? buildProcessCursor(rows[rows.length - 1]) : null

  return {
    message: 'تم جلب نتائج البحث بنجاح',
    data: {
      items: rows.map(toItem),
      pagination: buildCursorPaginationMeta({
        limit,
        cursor,
        nextCursor,
        hasNext
      })
    }
  }
}

/** أدمن — PROCESS_PUBLISH_MANAGE */
async function searchProcessDefinitions (query = {}) {
  const { error, value: filters } = validateProcessSearchQuery(query)

  if (error) {
    throw createHttpError(error, HTTP_STATUS.BAD_REQUEST, 'VALIDATION_ERROR')
  }

  return runProcessSearch(filters, query)
}

/** موظف — GET_ORGANIZATIONAL_STRUCTURE + organization_id إجباري */
async function searchProcessDefinitionsByOrganization (query = {}) {
  const { error, value: filters } = validateEmployeeOrgProcessSearchQuery(query)

  if (error) {
    throw createHttpError(error, HTTP_STATUS.BAD_REQUEST, 'VALIDATION_ERROR')
  }

  return runProcessSearch(filters, query)
}

module.exports = {
  searchProcessDefinitions,
  searchProcessDefinitionsByOrganization
}
