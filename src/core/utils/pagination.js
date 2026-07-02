'use strict'

const {
  HTTP_STATUS,
  createHttpError
} = require('../middleware/httpStatusCodes')

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 3
const MAX_LIMIT = 70

function parsePaginationQuery (query = {}, options = {}) {
  const defaultLimit = options.defaultLimit ?? DEFAULT_LIMIT
  const maxLimit = options.maxLimit ?? MAX_LIMIT

  const rawPage = query.page
  const rawLimit = query.limit

  if (rawPage !== undefined && rawPage !== '' && !/^\d+$/.test(String(rawPage))) {
    throw createHttpError(
      'page يجب أن يكون رقماً صحيحاً أكبر من أو يساوي 1',
      HTTP_STATUS.BAD_REQUEST,
      'VALIDATION_ERROR'
    )
  }

  if (rawLimit !== undefined && rawLimit !== '' && !/^\d+$/.test(String(rawLimit))) {
    throw createHttpError(
      `limit يجب أن يكون رقماً صحيحاً بين 1 و ${maxLimit}`,
      HTTP_STATUS.BAD_REQUEST,
      'VALIDATION_ERROR'
    )
  }

  const page = Math.max(1, parseInt(rawPage, 10) || DEFAULT_PAGE)
  let limit = parseInt(rawLimit, 10) || defaultLimit

  if (limit < 1) {
    limit = defaultLimit
  }

  if (limit > maxLimit) {
    limit = maxLimit
  }

  const offset = (page - 1) * limit

  return { page, limit, offset }
}

function buildPaginationMeta ({ page, limit, total }) {
  const totalPages = total > 0 ? Math.ceil(total / limit) : 0

  return {
    page,
    limit,
    total,
    total_pages: totalPages,
    has_next: page < totalPages,
    has_prev: page > 1
  }
}

function paginateArray (items, { page, limit, offset }) {
  const total = items.length
  const slice = items.slice(offset, offset + limit)

  return {
    items: slice,
    pagination: buildPaginationMeta({ page, limit, total })
  }
}

function emptyPaginatedResult ({ page, limit }) {
  return {
    items: [],
    pagination: buildPaginationMeta({ page, limit, total: 0 })
  }
}

module.exports = {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  parsePaginationQuery,
  buildPaginationMeta,
  paginateArray,
  emptyPaginatedResult
}
