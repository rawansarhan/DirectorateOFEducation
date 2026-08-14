'use strict'

const { Op } = require('sequelize')
const { escapeLike, likeContains, arabicIncludes, normalizeArabicAlef } = require('../../../../core/utils/escapeLike')

/**
 * أشكال بحث الاسم / الهوية / رقم المعاملة (نفس منطق بحث المعاملات).
 */
function buildApplicantNameOrConditions (rawQuery, { fieldPrefix = '' } = {}) {
  const f = (name) => (fieldPrefix ? `${fieldPrefix}${name}` : name)
  const tokens = String(rawQuery)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)

  if (!tokens.length) {
    return []
  }

  if (tokens.length === 1) {
    const like = likeContains(tokens[0])
    return [
      { [f('first_name')]: like },
      { [f('last_name')]: like },
      { [f('father_name')]: like },
      { [f('mother_name')]: like },
      { [f('national_id')]: like },
      { [f('id_process')]: like },
      { [f('code')]: like }
    ]
  }

  if (tokens.length === 2) {
    const [a, b] = tokens
    return [
      {
        [Op.and]: [
          { [f('first_name')]: likeContains(a) },
          { [f('last_name')]: likeContains(b) }
        ]
      },
      {
        [Op.and]: [
          { [f('first_name')]: likeContains(a) },
          { [f('father_name')]: likeContains(b) }
        ]
      },
      {
        [Op.and]: [
          { [f('first_name')]: likeContains(b) },
          { [f('last_name')]: likeContains(a) }
        ]
      }
    ]
  }

  const [a, b, c] = tokens
  return [
    {
      [Op.and]: [
        { [f('first_name')]: likeContains(a) },
        { [f('father_name')]: likeContains(b) },
        { [f('last_name')]: likeContains(c) }
      ]
    },
    {
      [Op.and]: [
        { [f('first_name')]: likeContains(a) },
        { [f('last_name')]: likeContains(c) }
      ]
    },
    {
      [Op.and]: [
        { [f('first_name')]: likeContains(a) },
        { [f('father_name')]: likeContains(b) }
      ]
    }
  ]
}

/**
 * شروط Sequelize على جدول Transaction (حقول مباشرة).
 */
function buildTransactionFieldWhere (filters = {}) {
  const and = []

  if (filters.first_name) and.push({ first_name: likeContains(filters.first_name) })
  if (filters.last_name) and.push({ last_name: likeContains(filters.last_name) })
  if (filters.father_name) and.push({ father_name: likeContains(filters.father_name) })
  if (filters.mother_name) and.push({ mother_name: likeContains(filters.mother_name) })
  if (filters.national_id) and.push({ national_id: likeContains(filters.national_id) })
  if (filters.id_process) and.push({ id_process: likeContains(filters.id_process) })
  if (filters.code) and.push({ code: likeContains(filters.code) })

  if (filters.q) {
    and.push({ [Op.or]: buildApplicantNameOrConditions(filters.q) })
  }

  return and
}

function buildProcessNameWhere (filters = {}) {
  return buildProcessDefinitionWhere(filters)
}

/**
 * شروط على process_definitions: اسم / نوع معاملة / معرف تعريف.
 * type_process_id alias لـ type_trans_id
 */
function buildProcessDefinitionWhere (filters = {}) {
  const where = {}

  if (filters.process_name) {
    where.name = likeContains(filters.process_name)
  }

  const typeProcessId = filters.type_process_id || filters.type_trans_id
  if (typeProcessId) {
    where.type_trans_id = Number(typeProcessId)
  }

  if (filters.process_definition_id) {
    where.id = Number(filters.process_definition_id)
  }

  return Object.keys(where).length ? where : null
}

function normalizeTypeDocIds (filters = {}) {
  const ids = []
  if (filters.type_doc_id) ids.push(Number(filters.type_doc_id))
  if (Array.isArray(filters.type_doc_ids)) {
    ids.push(...filters.type_doc_ids.map(Number))
  } else if (filters.type_doc_ids) {
    ids.push(
      ...String(filters.type_doc_ids)
        .split(',')
        .map(s => parseInt(s.trim(), 10))
    )
  }
  return [...new Set(ids.filter(n => Number.isInteger(n) && n > 0))]
}

/**
 * هل عنصر مهمة الموظف يطابق نص البحث (لفلترة in-memory للمهام النشطة).
 */
function taskItemMatchesSearch (item, filters = {}) {
  if (!filters || !Object.keys(filters).length) {
    return true
  }

  const hayApplicant = String(item?.applicant_name || '').toLowerCase()
  const hayProcess = String(item?.process_name || item?.type || '').toLowerCase()
  const hayNumber = String(item?.transaction_number || '').toLowerCase()

  const includes = (hay, needle) => arabicIncludes(hay, needle)

  if (filters.q) {
    const q = String(filters.q).trim().toLowerCase()
    if (!q) return true
    if (
      !arabicIncludes(hayApplicant, q) &&
      !arabicIncludes(hayProcess, q) &&
      !arabicIncludes(hayNumber, q)
    ) {
      const tokens = normalizeArabicAlef(q).split(/\s+/).filter(Boolean)
      const allInName = tokens.every(t => arabicIncludes(hayApplicant, t))
      if (!allInName) return false
    }
  }

  if (filters.process_name && !includes(hayProcess, filters.process_name)) {
    return false
  }

  if (filters.id_process && !includes(hayNumber, filters.id_process)) {
    return false
  }

  if (filters.first_name && !includes(hayApplicant, filters.first_name)) {
    return false
  }

  if (filters.last_name && !includes(hayApplicant, filters.last_name)) {
    return false
  }

  if (filters.father_name && !includes(hayApplicant, filters.father_name)) {
    return false
  }

  if (filters.mother_name && !includes(hayApplicant, filters.mother_name)) {
    return false
  }

  if (filters.national_id) {
    const needle = String(filters.national_id).trim()
    if (needle && !arabicIncludes(hayApplicant, needle) && !arabicIncludes(hayNumber, needle)) {
      return false
    }
  }

  const typeProcessId = filters.type_process_id || filters.type_trans_id
  if (typeProcessId != null) {
    const itemTypeId = item?.type_trans_id ?? item?.type_process_id
    if (Number(itemTypeId) !== Number(typeProcessId)) {
      return false
    }
  }

  if (filters.process_definition_id != null) {
    if (Number(item?.process_definition_id) !== Number(filters.process_definition_id)) {
      return false
    }
  }

  if (filters.from_date || filters.to_date) {
    const activityAt = item?.activity_at || item?.date
    if (!activityAt) return false
    const t = new Date(activityAt).getTime()
    if (filters.from_date) {
      const from = new Date(`${filters.from_date}T00:00:00.000`).getTime()
      if (t < from) return false
    }
    if (filters.to_date) {
      const to = new Date(`${filters.to_date}T23:59:59.999`).getTime()
      if (t > to) return false
    }
  }

  if (filters._allowedTransactionIds instanceof Set) {
    const tid = Number(item?.transaction_id)
    if (!filters._allowedTransactionIds.has(tid)) {
      return false
    }
  }

  return true
}

function hasAnySearchFilter (filters = {}) {
  return Boolean(
    filters.q ||
    filters.first_name ||
    filters.last_name ||
    filters.father_name ||
    filters.mother_name ||
    filters.national_id ||
    filters.id_process ||
    filters.code ||
    filters.process_name ||
    filters.type_process_id ||
    filters.type_trans_id ||
    filters.type_doc_id ||
    (filters.type_doc_ids && filters.type_doc_ids.length) ||
    filters.process_definition_id ||
    filters.from_date ||
    filters.to_date
  )
}

module.exports = {
  escapeLike,
  likeContains,
  normalizeArabicAlef,
  arabicIncludes,
  buildApplicantNameOrConditions,
  buildTransactionFieldWhere,
  buildProcessNameWhere,
  buildProcessDefinitionWhere,
  normalizeTypeDocIds,
  taskItemMatchesSearch,
  hasAnySearchFilter
}
