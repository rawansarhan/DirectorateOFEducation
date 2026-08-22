'use strict'

const {
  ensureSelfCardForUser,
  createSelfCard,
  findSelfCardById,
  findSelfCardByUserId,
  searchSelfCards
} = require('../repositories/employeeSelfCardRepository')
const {
  parseCursorPaginationQuery,
  buildCursorPaginationMeta,
  emptyCursorPaginatedResult,
  encodeCursor
} = require('../../../../core/utils/pagination')

function fail (message, statusCode = 400, code = 'VALIDATION_ERROR') {
  const err = new Error(message)
  err.statusCode = statusCode
  err.code = code
  return err
}

function toPlain (row) {
  return typeof row?.get === 'function' ? row.get({ plain: true }) : row
}

function toSearchItem (row) {
  const plain = toPlain(row)
  return {
    id: plain.id,
    user_id: plain.user_id ?? null,
    organization_id: plain.organization_id ?? null,
    self_number: plain.self_number ?? null,
    national_id: plain.national_id ?? null,
    full_name: plain.full_name ?? null,
    father_name: plain.father_name ?? null,
    mother_name: plain.mother_name ?? null,
    is_active: plain.is_active !== false
  }
}

async function getSelfCardById (selfCardId) {
  const id = Number(selfCardId)
  if (!Number.isInteger(id) || id < 1) {
    throw fail('معرّف البطاقة الذاتية غير صالح', 400)
  }

  const card = await findSelfCardById(id)
  if (!card) {
    throw fail('البطاقة الذاتية غير موجودة', 404, 'NOT_FOUND')
  }

  return {
    message: 'تم جلب البطاقة الذاتية بنجاح',
    data: toPlain(card)
  }
}

async function getEmployeeSelfCard (userId) {
  const numericUserId = Number(userId)

  if (!Number.isInteger(numericUserId) || numericUserId < 1) {
    throw fail('معرّف الموظف غير صالح', 400)
  }

  const card = await findSelfCardByUserId(numericUserId)

  if (!card) {
    throw fail('البطاقة الذاتية غير موجودة لهذا المستخدم', 404, 'NOT_FOUND')
  }

  return {
    message: 'تم جلب البطاقة الذاتية بنجاح',
    data: toPlain(card)
  }
}

async function searchSelfCardsService (query = {}) {
  const rawSearch = String(query.q ?? query.search ?? '').trim()
  const search = rawSearch.length ? rawSearch.slice(0, 100) : null

  const activeOnly =
    query.active_only === undefined
      ? true
      : !['0', 'false', 'no'].includes(String(query.active_only).toLowerCase())

  const { limit, cursor, decodedCursor } = parseCursorPaginationQuery(query, {
    defaultLimit: 20
  })

  if (decodedCursor && decodedCursor.k !== 'self_card') {
    throw fail('cursor غير صالح لهذا البحث', 400)
  }

  const { rows, hasNext } = await searchSelfCards({
    search: search || undefined,
    limit,
    cursorId: decodedCursor?.id ?? null,
    activeOnly
  })

  if (!rows.length) {
    return emptyCursorPaginatedResult({ limit, cursor })
  }

  const last = rows[rows.length - 1]
  const nextCursor = hasNext
    ? encodeCursor({ k: 'self_card', id: Number(last.id) })
    : null

  return {
    items: rows.map(toSearchItem),
    pagination: buildCursorPaginationMeta({
      limit,
      cursor,
      nextCursor,
      hasNext
    })
  }
}

async function createSelfCardService (body = {}) {
  const payload = { ...body }

  if (payload.user_id != null && payload.user_id !== '') {
    payload.user_id = Number(payload.user_id)
  } else {
    delete payload.user_id
  }

  try {
    const created = await createSelfCard(payload)
    return {
      message: 'تم إنشاء البطاقة الذاتية بنجاح',
      data: toPlain(created)
    }
  } catch (err) {
    if (err?.name === 'SequelizeUniqueConstraintError') {
      throw fail('يوجد بطاقة ذاتية بنفس الرقم الوطني أو user_id', 409, 'CONFLICT')
    }
    throw err
  }
}

module.exports = {
  getSelfCardById,
  getEmployeeSelfCard,
  searchSelfCardsService,
  createSelfCardService,
  ensureSelfCardForUser
}
