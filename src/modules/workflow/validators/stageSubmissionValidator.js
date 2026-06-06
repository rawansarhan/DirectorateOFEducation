'use strict'

const FILE_WIDGET_TYPES = new Set(['file_picker'])

const FIELD_WIDGET_TYPES = new Set([
  'text_field',
  'date_picker',
  'dropdown',
  'radio_group',
  'check_list'
])

function collectConfigWidgets (configJson = {}) {
  return (configJson.widgets || []).filter(widget => widget?.data?.id)
}

function normalizeFieldValue (value) {
  if (Array.isArray(value)) {
    return value
  }

  if (value === null || value === undefined) {
    return value
  }

  return value
}

function assertCheckListValue (widget, value) {
  const data = widget.data || {}
  const label = data.label || data.id
  const selected = Array.isArray(value)
    ? value
    : (value === null || value === undefined || value === '')
        ? []
        : [value]

  if (data.is_required && selected.length === 0) {
    throw new Error(`"${label}" مطلوب`)
  }

  if (selected.length < data.min_selected) {
    throw new Error(
      `"${label}" يتطلب اختيار ${data.min_selected} عنصر/عناصر على الأقل`
    )
  }

  if (selected.length > data.max_selected) {
    throw new Error(
      `"${label}" يسمح باختيار ${data.max_selected} عنصر/عناصر كحد أقصى`
    )
  }
}

function assertWidgetRules (widgets, fieldMap, fileMap) {
  for (const widget of widgets) {
    const data = widget.data || {}
    const widgetId = data.id
    const label = data.label || widgetId

    if (!data.is_required) {
      continue
    }

    if (FILE_WIDGET_TYPES.has(widget.widget_type)) {
      if (!fileMap[widgetId]) {
        throw new Error(`الملف "${label}" مطلوب`)
      }
      continue
    }

    if (widget.widget_type === 'check_list') {
      assertCheckListValue(widget, fieldMap[widgetId])
      continue
    }

    if (FIELD_WIDGET_TYPES.has(widget.widget_type)) {
      const value = normalizeFieldValue(fieldMap[widgetId])

      if (
        value === null ||
        value === undefined ||
        value === '' ||
        (Array.isArray(value) && value.length === 0)
      ) {
        throw new Error(`الحقل "${label}" مطلوب`)
      }
    }
  }
}

async function assertPayloadAgainstStageConfig (
  normalizedPayload,
  configJson = {},
  options = {}
) {
  const { mode = 'draft' } = options

  if (mode === 'draft') {
    return
  }

  const fieldMap = normalizedPayload.field_map || {}
  const fileMap = normalizedPayload.file_map || {}
  const widgets = collectConfigWidgets(configJson)

  if (!widgets.length) {
    return
  }

  assertWidgetRules(widgets, fieldMap, fileMap)
}

module.exports = {
  assertPayloadAgainstStageConfig,
  collectConfigWidgets
}
