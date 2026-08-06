'use strict'

/**
 * حدود تاريخ خفيفة لـ date_picker في stageConfig:
 * - "YYYY-MM-DD" مطلق (السلوك الحالي)
 * - "today" أو { type: "today" }
 * - { type: "relative", years?, months?, days? }  (سالب = قبل اليوم)
 */

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/

function pad2 (n) {
  return String(n).padStart(2, '0')
}

function toDateOnlyLocal (date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function startOfLocalDay (now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function addCalendarParts (baseDate, { years = 0, months = 0, days = 0 } = {}) {
  const date = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate()
  )

  if (years) {
    date.setFullYear(date.getFullYear() + Number(years))
  }

  if (months) {
    date.setMonth(date.getMonth() + Number(months))
  }

  if (days) {
    date.setDate(date.getDate() + Number(days))
  }

  return date
}

function isAbsoluteDateString (value) {
  return typeof value === 'string' && DATE_ONLY_RE.test(value.trim())
}

function isTodayBound (value) {
  if (value === 'today') {
    return true
  }

  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    value.type === 'today'
  )
}

function isRelativeBound (value) {
  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    value.type === 'relative'
  )
}

function isValidDateBound (value) {
  if (isAbsoluteDateString(value) || isTodayBound(value)) {
    return true
  }

  if (!isRelativeBound(value)) {
    return false
  }

  for (const key of ['years', 'months', 'days']) {
    if (value[key] == null) {
      continue
    }

    if (!Number.isInteger(Number(value[key]))) {
      return false
    }
  }

  return true
}

/**
 * @returns {string} YYYY-MM-DD
 */
function resolveDateBound (bound, now = new Date()) {
  if (bound == null) {
    throw new Error('حد التاريخ مطلوب')
  }

  if (isAbsoluteDateString(bound)) {
    return String(bound).trim()
  }

  const today = startOfLocalDay(now)

  if (isTodayBound(bound)) {
    return toDateOnlyLocal(today)
  }

  if (isRelativeBound(bound)) {
    const resolved = addCalendarParts(today, {
      years: Number(bound.years || 0),
      months: Number(bound.months || 0),
      days: Number(bound.days || 0)
    })

    return toDateOnlyLocal(resolved)
  }

  throw new Error('صيغة حد التاريخ غير صالحة')
}

function compareDateOnly (a, b) {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

function assertDateWithinBounds (value, minBound, maxBound, now = new Date()) {
  if (value == null || value === '') {
    return null
  }

  const dateValue = String(value).trim()

  if (!DATE_ONLY_RE.test(dateValue)) {
    return 'التاريخ يجب أن يكون بصيغة YYYY-MM-DD'
  }

  const min = resolveDateBound(minBound, now)
  const max = resolveDateBound(maxBound, now)

  if (compareDateOnly(dateValue, min) < 0 || compareDateOnly(dateValue, max) > 0) {
    return `التاريخ يجب أن يكون بين ${min} و ${max}`
  }

  return null
}

/**
 * يستبدل min_date/max_date بقيم YYYY-MM-DD للعرض في الاستمارة.
 * لا يعدّل الإعداد المخزّن — يُرجع نسخة خفيفة.
 */
function resolveDatePickerBoundsInConfig (configJson, now = new Date()) {
  if (!configJson || typeof configJson !== 'object') {
    return configJson
  }

  const widgets = configJson.widgets

  if (!Array.isArray(widgets) || !widgets.length) {
    return configJson
  }

  let changed = false

  const nextWidgets = widgets.map(widget => {
    if (widget?.widget_type !== 'date_picker' || !widget.data) {
      return widget
    }

    const { min_date: minDate, max_date: maxDate } = widget.data

    if (
      isAbsoluteDateString(minDate) &&
      isAbsoluteDateString(maxDate)
    ) {
      return widget
    }

    changed = true

    return {
      ...widget,
      data: {
        ...widget.data,
        min_date: resolveDateBound(minDate, now),
        max_date: resolveDateBound(maxDate, now)
      }
    }
  })

  if (!changed) {
    return configJson
  }

  return {
    ...configJson,
    widgets: nextWidgets
  }
}

/**
 * تخزين خفيف في VARCHAR: نص مطلق/today أو JSON للكائن.
 */
function serializeDateBound (bound) {
  if (bound == null) {
    return bound
  }

  if (typeof bound === 'string') {
    return bound.trim()
  }

  if (typeof bound === 'object') {
    return JSON.stringify(bound)
  }

  return String(bound)
}

function parseDateBound (raw) {
  if (raw == null) {
    return raw
  }

  if (typeof raw === 'object') {
    return raw
  }

  const text = String(raw).trim()

  if (!text) {
    return text
  }

  if (text.startsWith('{')) {
    try {
      return JSON.parse(text)
    } catch (_) {
      return text
    }
  }

  return text
}

module.exports = {
  DATE_ONLY_RE,
  isValidDateBound,
  isAbsoluteDateString,
  resolveDateBound,
  assertDateWithinBounds,
  resolveDatePickerBoundsInConfig,
  compareDateOnly,
  serializeDateBound,
  parseDateBound
}
