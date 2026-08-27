'use strict'

const { Op } = require('sequelize')
const { EmployeeSelfCard } = require('../../../../entities')

const UNIQUE_FIELD_LABELS = {
  user_id: 'معرّف المستخدم (user_id)',
  self_number: 'الرقم الذاتي',
  national_id: 'الرقم الوطني',
  insurance_number: 'الرقم التأميني'
}

const UNIQUE_FIELDS = Object.keys(UNIQUE_FIELD_LABELS)

function createConflictError (conflicts = []) {
  const labels = conflicts.map(item => item.label)
  const fields = conflicts.map(item => item.field)
  const values = Object.fromEntries(
    conflicts.map(item => [item.field, item.value])
  )

  const message =
    conflicts.length === 1
      ? `قد تم إنشاء بطاقة ذاتية بنفس ${labels[0]}`
      : `قد تم إنشاء بطاقة ذاتية بنفس (${labels.join('، ')})`

  const err = new Error(message)
  err.code = 'CONFLICT'
  err.statusCode = 409
  err.fields = fields
  err.conflicts = conflicts
  err.data = {
    fields,
    values,
    conflicts
  }
  return err
}

function normalizeUniqueValue (field, raw) {
  if (raw === undefined || raw === null || raw === '') {
    return null
  }

  if (field === 'user_id') {
    const n = Number(raw)
    return Number.isInteger(n) && n > 0 ? n : null
  }

  const text = String(raw).trim()
  return text === '' ? null : text
}

/**
 * يتحقق أن الحقول الفريدة غير مستخدمة مسبقاً.
 * يرمي CONFLICT مع أسماء الحقول المتعارضة.
 */
async function assertSelfCardUniqueFields (
  payload = {},
  { excludeId = null, transaction = null } = {}
) {
  const conflicts = []

  for (const field of UNIQUE_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(payload, field)) {
      continue
    }

    const value = normalizeUniqueValue(field, payload[field])
    if (value == null) {
      continue
    }

    const where = { [field]: value }

    if (excludeId != null && Number.isInteger(Number(excludeId))) {
      where.id = { [Op.ne]: Number(excludeId) }
    }

    const existing = await EmployeeSelfCard.findOne({
      where,
      attributes: ['id', field],
      transaction
    })

    if (existing) {
      conflicts.push({
        field,
        label: UNIQUE_FIELD_LABELS[field],
        value,
        existing_self_card_id: existing.id
      })
    }
  }

  if (conflicts.length) {
    throw createConflictError(conflicts)
  }
}

module.exports = {
  UNIQUE_FIELDS,
  UNIQUE_FIELD_LABELS,
  normalizeUniqueValue,
  assertSelfCardUniqueFields,
  createConflictError
}
