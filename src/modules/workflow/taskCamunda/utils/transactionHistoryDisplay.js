'use strict'

const {
  enrichFilePickerWidget,
  enrichStageSnapshot,
  isStageFormSnapshot
} = require('../../../../core/utils/filePath')

const ACTIVITY_STAGE_KEY_PATTERN = /^Activity_[A-Za-z0-9_]+$/

const FORM_ROOT_KEYS = new Set([
  'stage_name',
  'form_id',
  'form_name',
  'widgets',
  'templates',
  'decision',
  'note',
  'files',
  'fields',
  'completed_by',
  'completed_at'
])

function isActivityStageKey (key) {
  return ACTIVITY_STAGE_KEY_PATTERN.test(String(key))
}

function isInternalDataKey (key) {
  return String(key).startsWith('_')
}

function enrichWidgets (widgets) {
  if (!Array.isArray(widgets)) {
    return widgets
  }

  return widgets.map(enrichFilePickerWidget)
}

function copyFormRootFields (source = {}, target = {}) {
  for (const key of FORM_ROOT_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) {
      continue
    }

    if (key === 'widgets') {
      target.widgets = enrichWidgets(source.widgets)
      continue
    }

    target[key] = source[key]
  }

  return target
}

function hasActivityStageKeys (data = {}) {
  return Object.keys(data).some(isActivityStageKey)
}

function omitActivityStageKeys (data = {}) {
  const cleaned = {}

  for (const [key, value] of Object.entries(data)) {
    if (isActivityStageKey(key) || isInternalDataKey(key)) {
      continue
    }

    cleaned[key] = value
  }

  return cleaned
}

function buildCompletedStagesFromData (rawData = {}) {
  const stages = []

  for (const [key, value] of Object.entries(rawData)) {
    if (!isActivityStageKey(key) || !value || typeof value !== 'object') {
      continue
    }

    const entry = {
      stage_name: value.stage_name || null,
      decision: value.decision ?? null,
      note: value.note ?? '',
      variables: value.variables ?? null,
      fields: value.fields ?? null,
      files: value.files ?? null,
      templates: value.templates ?? null,
      rejection_reason: value.rejection_reason ?? null,
      completed_by: value.completed_by ?? null,
      completed_at: value.completed_at ?? null
    }

    if (Array.isArray(value.widgets) && value.widgets.length) {
      entry.widgets = enrichWidgets(value.widgets)
    }

    stages.push(entry)
  }

  return stages.sort((a, b) => {
    const dateA = a.completed_at ? new Date(a.completed_at).getTime() : 0
    const dateB = b.completed_at ? new Date(b.completed_at).getTime() : 0
    return dateA - dateB
  })
}

/**
 * Prepares transaction.data for task-details display:
 * - Keeps citizen submission snapshot at root (form_id, widgets, ...)
 * - Adds completed_stages[] from saved Activity_* snapshots (without exposing raw keys)
 */
function formatTransactionHistoryForDisplay (rawData = {}) {
  if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
    return {}
  }

  const cleaned = omitActivityStageKeys(rawData)
  const display = copyFormRootFields(cleaned, {})
  const completedStages = buildCompletedStagesFromData(rawData)

  if (completedStages.length) {
    display.completed_stages = completedStages
  }

  if (!Object.keys(display).length) {
    return {}
  }

  if (isStageFormSnapshot(display)) {
    return enrichStageSnapshot(display)
  }

  return display
}

module.exports = {
  formatTransactionHistoryForDisplay,
  isActivityStageKey,
  hasActivityStageKeys
}
