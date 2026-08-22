'use strict'

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
  'organization_id',
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
//to build the full name for user
function buildFullName (user = {}) {
  return [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || null
}
// to ensure the self card for user 
async function ensureSelfCardForUser (userId, extras = {}, options = {}) {
  const numericUserId = Number(userId)

  if (!Number.isInteger(numericUserId) || numericUserId < 1) {
    const err = new Error('user_id غير صالح لإنشاء البطاقة الذاتية')
    err.code = 'VALIDATION_ERROR'
    throw err
  }
// to check if the self card already exists
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
      national_id: extras.national_id ?? user.national_id ?? null,
      full_name: extras.full_name ?? buildFullName(user),
      father_name: extras.father_name ?? user.father_name ?? null,
      mother_name: extras.mother_name ?? user.mother_name ?? null,
      organization_id: extras.organization_id ?? null,
      ...Object.fromEntries(
        PROFILE_FIELDS
          .filter(key => extras[key] !== undefined && !['national_id', 'full_name', 'father_name', 'mother_name', 'organization_id'].includes(key))
          .map(key => [key, extras[key]])
      )
    },
    { transaction: options.transaction }
  )
}
// to find the self card by user id 
async function findSelfCardByUserId (userId) {
  return EmployeeSelfCard.findOne({
    where: { user_id: Number(userId) },
    include: [
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
  })
}

//to find the history by source
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
// to create the history row 
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

  await selfCard.update(patch, options)
  return selfCard.reload(options)
}

module.exports = {
  HISTORY_MODELS,
  PROFILE_FIELDS,
  ensureSelfCardForUser,
  findSelfCardByUserId,
  findHistoryBySource,
  createHistoryRow,
  updateProfileHeader
}
