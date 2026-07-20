'use strict'

function parseDepartmentIds ({ query = {} } = {}) {
  const rawParts = []
  const fromQuery = query.department_ids ?? query.department_id

  if (fromQuery != null && String(fromQuery).trim() !== '') {
    if (Array.isArray(fromQuery)) {
      rawParts.push(...fromQuery.map(value => String(value).trim()))
    } else {
      rawParts.push(...String(fromQuery).split(','))
    }
  }

  const departmentIds = [
    ...new Set(
      rawParts
        .map(part => String(part).trim())
        .filter(Boolean)
        .map(part => parseInt(part, 10))
        .filter(id => Number.isInteger(id) && id >= 1)
    )
  ]

  if (!departmentIds.length) {
    const error = new Error(
      'department_ids مطلوب — مثال: ?department_ids=1 أو ?department_ids=1,2,3'
    )
    error.code = 'VALIDATION_ERROR'
    throw error
  }

  return departmentIds
}

function parseBoundaryDate (value, { endOfDay = false } = {}) {
  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    const error = new Error(`تاريخ غير صالح: ${value}`)
    error.code = 'VALIDATION_ERROR'
    throw error
  }

  if (endOfDay) {
    parsed.setHours(23, 59, 59, 999)
  } else {
    parsed.setHours(0, 0, 0, 0)
  }

  return parsed
}

function parseDateRange ({ query = {} } = {}) {
  const fromRaw = query.from_date ?? query.date_from
  const toRaw = query.to_date ?? query.date_to

  if (
    (fromRaw == null || String(fromRaw).trim() === '') &&
    (toRaw == null || String(toRaw).trim() === '')
  ) {
    return { fromDate: null, toDate: null }
  }

  const fromDate = fromRaw != null && String(fromRaw).trim() !== ''
    ? parseBoundaryDate(fromRaw, { endOfDay: false })
    : null
  const toDate = toRaw != null && String(toRaw).trim() !== ''
    ? parseBoundaryDate(toRaw, { endOfDay: true })
    : null

  if (fromDate && toDate && fromDate > toDate) {
    const error = new Error('from_date يجب أن يكون قبل أو يساوي to_date')
    error.code = 'VALIDATION_ERROR'
    throw error
  }

  return { fromDate, toDate }
}

module.exports = {
  parseDepartmentIds,
  parseDateRange
}
