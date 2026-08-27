'use strict'

const { Op } = require('sequelize')
const {
  EmployeeSelfCard,
  EmployeeTrainingCourse,
  EmployeeEmploymentStatus,
  EmployeeIrregularAbsence,
  EmployeeLeave,
  EmployeeReward,
  EmployeeSanction,
  User
} = require('../../../../entities')

const HISTORY_MODELS = {
  training_course: EmployeeTrainingCourse,
  employment_status: EmployeeEmploymentStatus,
  irregular_absence: EmployeeIrregularAbsence,
  leave: EmployeeLeave,
  reward: EmployeeReward,
  sanction: EmployeeSanction
}

const PROFILE_FIELDS = [
  'public_entity',
  'self_number',
  'national_id',
  'insurance_number',
  'full_name',
  'father_name',
  'mother_name',
  'birth_place',
  'birth_date',
  'registry_place',
  'registry_number',
  'gender',
  'nationality',
  'foreign_language',
  'education_degree',
  'current_residence'
]

const HISTORY_INCLUDES = [
  {
    model: EmployeeTrainingCourse,
    as: 'training_courses',
    separate: true,
    order: [['created_at', 'DESC']]
  },
  {
    model: EmployeeEmploymentStatus,
    as: 'employment_statuses',
    separate: true,
    order: [['created_at', 'DESC']]
  },
  {
    model: EmployeeIrregularAbsence,
    as: 'irregular_absences',
    separate: true,
    order: [['created_at', 'DESC']]
  },
  {
    model: EmployeeLeave,
    as: 'leaves',
    separate: true,
    order: [['created_at', 'DESC']]
  },
  {
    model: EmployeeReward,
    as: 'rewards',
    separate: true,
    order: [['created_at', 'DESC']]
  },
  {
    model: EmployeeSanction,
    as: 'sanctions',
    separate: true,
    order: [['created_at', 'DESC']]
  }
]

function buildFullName (user = {}) {
  return [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || null
}

function pickProfileExtras (extras = {}) {
  const patch = {}
  for (const key of PROFILE_FIELDS) {
    if (extras[key] !== undefined) {
      patch[key] = extras[key]
    }
  }
  return patch
}

async function ensureSelfCardForUser (userId, extras = {}, options = {}) {
  const numericUserId = Number(userId)

  if (!Number.isInteger(numericUserId) || numericUserId < 1) {
    const err = new Error('user_id غير صالح لإنشاء البطاقة الذاتية')
    err.code = 'VALIDATION_ERROR'
    throw err
  }

  const existing = await EmployeeSelfCard.findOne({
    where: { user_id: numericUserId },
    transaction: options.transaction
  })

  if (existing) {
    return existing
  }

  const user = await User.findByPk(numericUserId, {
    transaction: options.transaction
  })

  if (!user) {
    const err = new Error(`المستخدم #${numericUserId} غير موجود`)
    err.code = 'NOT_FOUND'
    throw err
  }

  return EmployeeSelfCard.create(
    {
      user_id: numericUserId,
      is_active: extras.is_active !== undefined ? Boolean(extras.is_active) : true,
      national_id: extras.national_id ?? user.national_id ?? null,
      full_name: extras.full_name ?? buildFullName(user),
      father_name: extras.father_name ?? user.father_name ?? null,
      mother_name: extras.mother_name ?? user.mother_name ?? null,
      public_entity: extras.public_entity ?? null,
      ...pickProfileExtras(extras)
    },
    { transaction: options.transaction }
  ).then(async (created) => {
    const { invalidateSelfCards } = require('../../../../core/cache/apiCacheService')
    await invalidateSelfCards(created.id)
    return created
  })
}

async function createSelfCard (payload = {}, options = {}) {
  const data = pickProfileExtras(payload)

  if (payload.user_id != null && payload.user_id !== '') {
    const numericUserId = Number(payload.user_id)
    if (!Number.isInteger(numericUserId) || numericUserId < 1) {
      const err = new Error('user_id غير صالح')
      err.code = 'VALIDATION_ERROR'
      throw err
    }
    data.user_id = numericUserId
  }

  if (payload.is_active !== undefined) {
    data.is_active = Boolean(payload.is_active)
  } else {
    data.is_active = true
  }

  if (!data.full_name && !data.national_id) {
    const err = new Error('full_name أو national_id مطلوب لإنشاء البطاقة الذاتية')
    err.code = 'VALIDATION_ERROR'
    throw err
  }

  const {
    assertSelfCardUniqueFields
  } = require('../services/selfCardUniquenessService')

  await assertSelfCardUniqueFields(data, {
    transaction: options.transaction
  })

  return EmployeeSelfCard.create(data, { transaction: options.transaction })
}

async function findSelfCardById (selfCardId, { withHistory = true } = {}) {
  return EmployeeSelfCard.findByPk(Number(selfCardId), {
    include: withHistory ? HISTORY_INCLUDES : undefined
  })
}

async function findSelfCardByUserId (userId, { withHistory = true } = {}) {
  return EmployeeSelfCard.findOne({
    where: { user_id: Number(userId) },
    include: withHistory ? HISTORY_INCLUDES : undefined
  })
}

async function searchSelfCards ({ search, limit = 20, cursorId = null, activeOnly = true } = {}) {
  const and = []

  if (activeOnly) {
    and.push({ is_active: true })
  }

  if (search) {
    const { likeContains } = require('../../../../core/utils/escapeLike')
    const like = likeContains(search)
    and.push({
      [Op.or]: [
        { full_name: like },
        { national_id: like },
        { self_number: like },
        { father_name: like },
        { mother_name: like }
      ]
    })
  }

  if (cursorId != null && Number.isFinite(Number(cursorId))) {
    and.push({ id: { [Op.gt]: Number(cursorId) } })
  }

  const rows = await EmployeeSelfCard.findAll({
    where: and.length ? { [Op.and]: and } : {},
    attributes: [
      'id',
      'user_id',
      'public_entity',
      'self_number',
      'national_id',
      'full_name',
      'father_name',
      'mother_name',
      'is_active',
      'created_at',
      'updated_at'
    ],
    order: [['id', 'ASC']],
    limit: limit + 1
  })

  const hasNext = rows.length > limit
  return { rows: hasNext ? rows.slice(0, limit) : rows, hasNext }
}

/**
 * بطاقات نشطة + دوراتها (للترشيح حسب غياب دورة بعنوان معيّن).
 */
async function findActiveSelfCardsWithCourses ({ publicEntity = null } = {}) {
  const where = { is_active: true }

  if (publicEntity != null && String(publicEntity).trim() !== '') {
    where.public_entity = String(publicEntity).trim()
  }

  const cards = await EmployeeSelfCard.findAll({
    where,
    attributes: [
      'id',
      'user_id',
      'public_entity',
      'self_number',
      'national_id',
      'full_name',
      'father_name',
      'mother_name',
      'is_active'
    ],
    order: [['id', 'ASC']]
  })

  if (!cards.length) {
    return { cards: [], coursesByCardId: new Map() }
  }

  const cardIds = cards.map(card => card.id)
  const courses = await EmployeeTrainingCourse.findAll({
    where: { self_card_id: { [Op.in]: cardIds } },
    attributes: ['id', 'self_card_id', 'title', 'normalized_title', 'provider', 'topic'],
    order: [['id', 'ASC']]
  })

  const coursesByCardId = new Map()

  for (const course of courses) {
    const plain =
      typeof course.get === 'function' ? course.get({ plain: true }) : course
    const list = coursesByCardId.get(plain.self_card_id) || []
    list.push(plain)
    coursesByCardId.set(plain.self_card_id, list)
  }

  return { cards, coursesByCardId }
}

async function findHistoryBySource ({
  target,
  sourceTransactionId,
  sourceStageCode,
  transaction = null
}) {
  const Model = HISTORY_MODELS[target]

  if (!Model) {
    return null
  }

  return Model.findOne({
    where: {
      source_transaction_id: sourceTransactionId,
      source_stage_code: sourceStageCode
    },
    transaction
  })
}

async function createHistoryRow ({
  target,
  payload,
  transaction = null
}) {
  const Model = HISTORY_MODELS[target]

  if (!Model) {
    const err = new Error(`target غير مدعوم: ${target}`)
    err.code = 'VALIDATION_ERROR'
    throw err
  }

  return Model.create(payload, { transaction })
}

async function updateProfileHeader (selfCard, mappedFields = {}, options = {}) {
  const patch = {}

  for (const key of PROFILE_FIELDS) {
    if (mappedFields[key] !== undefined) {
      patch[key] = mappedFields[key]
    }
  }

  if (!Object.keys(patch).length) {
    return selfCard
  }

  const {
    assertSelfCardUniqueFields
  } = require('../services/selfCardUniquenessService')

  await assertSelfCardUniqueFields(patch, {
    excludeId: selfCard.id,
    transaction: options.transaction
  })

  await selfCard.update(patch, options)
  return selfCard.reload(options)
}

module.exports = {
  HISTORY_MODELS,
  PROFILE_FIELDS,
  ensureSelfCardForUser,
  createSelfCard,
  findSelfCardById,
  findSelfCardByUserId,
  searchSelfCards,
  findActiveSelfCardsWithCourses,
  findHistoryBySource,
  createHistoryRow,
  updateProfileHeader
}
