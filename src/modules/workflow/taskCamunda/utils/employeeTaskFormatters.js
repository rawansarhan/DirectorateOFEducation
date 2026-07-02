'use strict'

const PROCESS_PRIORITY = Object.freeze({
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3
})

const PROCESS_PRIORITY_LABELS = Object.freeze({
  1: 'عالي',
  2: 'متوسط',
  3: 'منخفض'
})

function normalizeProcessPriority (value) {
  const numeric = Number(value)

  if (numeric === PROCESS_PRIORITY.HIGH) {
    return PROCESS_PRIORITY.HIGH
  }

  if (numeric === PROCESS_PRIORITY.MEDIUM) {
    return PROCESS_PRIORITY.MEDIUM
  }

  if (numeric === PROCESS_PRIORITY.LOW) {
    return PROCESS_PRIORITY.LOW
  }

  return PROCESS_PRIORITY.MEDIUM
}

function formatTransactionDate (value) {
  if (!value) {
    return null
  }

  const date = value instanceof Date ? value : parseTransactionDate(value)

  if (!date || Number.isNaN(date.getTime())) {
    return null
  }

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()

  return `${day}/${month}/${year}`
}

function parseTransactionDate (value) {
  if (!value) {
    return null
  }

  if (value instanceof Date) {
    return value
  }

  const text = String(value).trim()

  const dmyMatch = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)

  if (dmyMatch) {
    const [, day, month, year] = dmyMatch
    return new Date(Number(year), Number(month) - 1, Number(day))
  }

  const parsed = new Date(text)

  return Number.isNaN(parsed.getTime()) ? null : parsed
}

module.exports = {
  PROCESS_PRIORITY,
  PROCESS_PRIORITY_LABELS,
  normalizeProcessPriority,
  formatTransactionDate,
  parseTransactionDate
}
