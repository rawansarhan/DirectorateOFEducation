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

function encodeCursor (payload = {}) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url')
}

function decodeCursor (rawValue) {
  if (rawValue == null || String(rawValue).trim() === '') {
    return null
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(String(rawValue).trim(), 'base64url').toString('utf8')
    )

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('invalid cursor payload')
    }

    const kind = parsed.k || 'task'
    const createdAt = parsed.t
    const id = Number(parsed.id)

    if (kind === 'dept_emp') {
      if (!Number.isFinite(id)) {
        throw new Error('invalid department employee cursor fields')
      }

      return {
        k: 'dept_emp',
        id
      }
    }

    if (kind === 'notif') {
      if (
        !createdAt ||
        !Number.isFinite(id) ||
        Number.isNaN(new Date(createdAt).getTime())
      ) {
        throw new Error('invalid notification cursor fields')
      }

      return {
        k: 'notif',
        t: new Date(createdAt).toISOString(),
        id
      }
    }

    if (kind === 'stage') {
      if (
        !createdAt ||
        !Number.isFinite(id) ||
        Number.isNaN(new Date(createdAt).getTime())
      ) {
        throw new Error('invalid stage cursor fields')
      }

      return {
        k: 'stage',
        t: new Date(createdAt).toISOString(),
        id
      }
    }

    // Merged employee task list (status=all) — offset-based cursor
    if (kind === 'all') {
      const offset = Number(parsed.o)

      if (!Number.isFinite(offset) || offset < 0) {
        throw new Error('invalid all-list cursor fields')
      }

      return {
        k: 'all',
        o: Math.floor(offset)
      }
    }

    const priority = Number(parsed.p)

    if (
      !Number.isFinite(priority) ||
      !createdAt ||
      !Number.isFinite(id) ||
      Number.isNaN(new Date(createdAt).getTime())
    ) {
      throw new Error('invalid cursor fields')
    }

    return {
      k: kind,
      p: priority,
      t: new Date(createdAt).toISOString(),
      id
    }
  } catch (error) {
    if (error.code === 'VALIDATION_ERROR') {
      throw error
    }

    throw createHttpError(
      'cursor غير صالح',
      HTTP_STATUS.BAD_REQUEST,
      'VALIDATION_ERROR'
    )
  }
}

function parseCursorPaginationQuery (query = {}, options = {}) {
  const defaultLimit = options.defaultLimit ?? DEFAULT_LIMIT
  const maxLimit = options.maxLimit ?? MAX_LIMIT

  const rawLimit = query.limit

  if (rawLimit !== undefined && rawLimit !== '' && !/^\d+$/.test(String(rawLimit))) {
    throw createHttpError(
      `limit يجب أن يكون رقماً صحيحاً بين 1 و ${maxLimit}`,
      HTTP_STATUS.BAD_REQUEST,
      'VALIDATION_ERROR'
    )
  }

  let limit = parseInt(rawLimit, 10) || defaultLimit

  if (limit < 1) {
    limit = defaultLimit
  }

  if (limit > maxLimit) {
    limit = maxLimit
  }

  const cursorRaw = query.cursor
  let cursor =
    cursorRaw != null && String(cursorRaw).trim() !== ''
      ? String(cursorRaw).trim()
      : null

  // Swagger UI often auto-fills string params with the literal "string"
  if (
    cursor &&
    ['string', 'cursor', 'null', 'undefined'].includes(cursor.toLowerCase())
  ) {
    cursor = null
  }

  const decodedCursor = decodeCursor(cursor)

  return { limit, cursor, decodedCursor }
}

function buildCursorPaginationMeta ({ limit, cursor = null, nextCursor = null, hasNext = false }) {
  return {
    limit,
    cursor: cursor ?? null,
    next_cursor: nextCursor ?? null,
    has_next: hasNext,
    has_prev: Boolean(cursor)
  }
}

function emptyCursorPaginatedResult ({ limit, cursor = null }) {
  return {
    items: [],
    pagination: buildCursorPaginationMeta({
      limit,
      cursor,
      nextCursor: null,
      hasNext: false
    })
  }
}

module.exports = {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  parsePaginationQuery,
  parseCursorPaginationQuery,
  buildPaginationMeta,
  buildCursorPaginationMeta,
  encodeCursor,
  decodeCursor,
  paginateArray,
  emptyPaginatedResult,
  emptyCursorPaginatedResult
}
