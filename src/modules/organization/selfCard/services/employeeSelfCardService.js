'use strict'

const {
  ensureSelfCardForUser,
  createSelfCard,
  findSelfCardById,
  findSelfCardByUserId,
  searchSelfCards,
  findActiveSelfCardsWithCourses
} = require('../repositories/employeeSelfCardRepository')
const {
  parseCursorPaginationQuery,
  buildCursorPaginationMeta,
  emptyCursorPaginatedResult,
  encodeCursor
} = require('../../../../core/utils/pagination')
const {
  combinedTitleSimilarity,
  normalizeSearchText
} = require('../../../../core/utils/textSimilarity')
const {
  getOrLoad,
  KEYS,
  invalidateSelfCards
} = require('../../../../core/cache/apiCacheService')
const { API_CACHE_TTL_SECONDS } = require('../../../../core/config/env')

/** فوق هذا الحد نعتبر أن الشخص حضر دورة بنفس العنوان/المعنى */
const ATTENDED_MATCH_THRESHOLD = 0.62

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

function parsePositiveLimit (raw, { defaultLimit = 20, maxLimit = 100 } = {}) {
  if (raw === undefined || raw === null || raw === '') {
    return defaultLimit
  }

  const n = Number(raw)
  if (!Number.isInteger(n) || n < 1) {
    throw fail(`limit يجب أن يكون رقماً صحيحاً بين 1 و ${maxLimit}`)
  }

  return Math.min(n, maxLimit)
}

function courseCandidateText (course = {}) {
  return [course.title, course.normalized_title, course.topic]
    .filter(Boolean)
    .join(' ')
}

function evaluateCardAgainstTitle (card, courses = [], queryTitle) {
  const plain = toPlain(card)

  if (!courses.length) {
    return {
      ...toSearchItem(plain),
      recommendation_priority: 0,
      max_similarity: 0,
      training_courses_count: 0,
      reason: 'never_attended_any_course',
      closest_course: null
    }
  }

  let maxSimilarity = 0
  let closest = null

  for (const course of courses) {
    const similarity = combinedTitleSimilarity(
      queryTitle,
      courseCandidateText(course)
    )

    if (similarity > maxSimilarity) {
      maxSimilarity = similarity
      closest = {
        id: course.id,
        title: course.title,
        topic: course.topic ?? null,
        similarity
      }
    }
  }

  if (maxSimilarity >= ATTENDED_MATCH_THRESHOLD) {
    return null
  }

  return {
    ...toSearchItem(plain),
    recommendation_priority: 1,
    max_similarity: maxSimilarity,
    training_courses_count: courses.length,
    reason: 'no_matching_course_title',
    closest_course: closest
  }
}

/**
 * ترشيح بطاقات لم تحضر دورة بعنوان قريب من المطلوب.
 * الترتيب:
 * 1) من بلا أي دورة أبداً
 * 2) من لديهم دورات لكن غير مطابقة للعنوان (الأقل تشابهاً أولاً)
 */
async function recommendByMissingTrainingService (query = {}) {
  const title = String(query.title ?? query.q ?? query.search ?? '').trim()

  if (!title || title.length < 2) {
    throw fail('title مطلوب (عنوان الدورة المطلوب البحث عنها)')
  }

  if (title.length > 256) {
    throw fail('title طويل جداً (الحد 256)')
  }

  const limit = parsePositiveLimit(query.limit, {
    defaultLimit: 20,
    maxLimit: 100
  })
  const organizationId =
    query.organization_id != null && query.organization_id !== ''
      ? Number(query.organization_id)
      : null

  if (
    organizationId != null &&
    (!Number.isInteger(organizationId) || organizationId < 1)
  ) {
    throw fail('organization_id غير صالح')
  }

  const { cards, coursesByCardId } = await findActiveSelfCardsWithCourses({
    organizationId
  })

  const candidates = []

  for (const card of cards) {
    const evaluated = evaluateCardAgainstTitle(
      card,
      coursesByCardId.get(card.id) || [],
      title
    )

    if (evaluated) {
      candidates.push(evaluated)
    }
  }

  candidates.sort((a, b) => {
    if (a.recommendation_priority !== b.recommendation_priority) {
      return a.recommendation_priority - b.recommendation_priority
    }

    if (a.max_similarity !== b.max_similarity) {
      return a.max_similarity - b.max_similarity
    }

    return a.id - b.id
  })

  const items = candidates.slice(0, limit)

  return {
    query: {
      title,
      normalized_title: normalizeSearchText(title),
      limit,
      organization_id: organizationId,
      match_threshold: ATTENDED_MATCH_THRESHOLD
    },
    total_candidates: candidates.length,
    returned: items.length,
    items
  }
}

async function getSelfCardById (selfCardId) {
  const id = Number(selfCardId)
  if (!Number.isInteger(id) || id < 1) {
    throw fail('معرّف البطاقة الذاتية غير صالح', 400)
  }

  const data = await getOrLoad(
    KEYS.selfCardById(id),
    async () => {
      const card = await findSelfCardById(id)
      if (!card) {
        throw fail('البطاقة الذاتية غير موجودة', 404, 'NOT_FOUND')
      }
      return toPlain(card)
    },
    {
      label: `self-cards:id:${id}`,
      ttlSeconds: API_CACHE_TTL_SECONDS
    }
  )

  return {
    message: 'تم جلب البطاقة الذاتية بنجاح',
    data
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

  return getOrLoad(
    KEYS.selfCardsSearch(search, activeOnly, cursor, limit),
    async () => {
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
    },
    {
      label: 'self-cards:search',
      ttlSeconds: API_CACHE_TTL_SECONDS
    }
  )
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
    await invalidateSelfCards(created?.id ?? null)
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
  recommendByMissingTrainingService,
  createSelfCardService,
  ensureSelfCardForUser,
  ATTENDED_MATCH_THRESHOLD
}
