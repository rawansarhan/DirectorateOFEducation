'use strict'

const {
  assertDateWithinBounds
} = require('../../../core/utils/dateBound')

const FILE_WIDGET_TYPES = new Set(['file_picker'])

const FIELD_WIDGET_TYPES = new Set([
  'text_field',
  'date_picker',
  'dropdown',
  'radio_group',
  'check_list',
  'employee_picker'
])

function collectConfigWidgets (configJson = {}) {
  return (configJson.widgets || []).filter(widget => widget?.data?.id)
}

function buildFilePickerTypeDocMap (configJson = {}) {
  const map = new Map()

  for (const widget of configJson.widgets || []) {
    if (widget.widget_type !== 'file_picker') {
      continue
    }

    const widgetId = widget.data?.id
    const typeDocId = Number(widget.data?.type_doc_id)

    if (widgetId && Number.isInteger(typeDocId) && typeDocId > 0) {
      map.set(widgetId, typeDocId)
    }
  }

  return map
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

function assertFilesMatchConfig (files = [], configJson = {}) {
  const pickerMap = buildFilePickerTypeDocMap(configJson)

  if (!pickerMap.size) {
    return
  }

  const filesByKey = new Map()

  for (const file of files) {
    if (!file?.key) {
      continue
    }

    if (filesByKey.has(file.key)) {
      throw new Error(`الملف "${file.key}" مكرر في files`)
    }

    filesByKey.set(file.key, file)

    const expectedTypeDocId = pickerMap.get(file.key)

    if (expectedTypeDocId == null) {
      throw new Error(
        `الملف "${file.key}" غير معرّف في استمارة المرحلة (file_picker)`
      )
    }

    const submittedTypeDocId = Number(file.type_doc_id)

    if (submittedTypeDocId !== expectedTypeDocId) {
      throw new Error(
        `type_doc_id للملف "${file.key}" يجب أن يكون ${expectedTypeDocId} كما في stage_config`
      )
    }
  }

  for (const [widgetId, typeDocId] of pickerMap.entries()) {
    const widget = (configJson.widgets || []).find(
      item => item.widget_type === 'file_picker' && item.data?.id === widgetId
    )

    if (!widget?.data?.is_required) {
      continue
    }

    if (!filesByKey.has(widgetId)) {
      const label = widget.data.label || widgetId
      throw new Error(`الملف "${label}" مطلوب`)
    }
  }
}

function assertDatePickerValue (widget, value) {
  const data = widget.data || {}
  const label = data.label || data.id

  if (value === null || value === undefined || value === '') {
    if (data.is_required) {
      throw new Error(`الحقل "${label}" مطلوب`)
    }

    return
  }

  const rangeError = assertDateWithinBounds(
    value,
    data.min_date,
    data.max_date
  )

  if (rangeError) {
    throw new Error(`"${label}": ${rangeError}`)
  }
}

function assertWidgetRules (widgets, fieldMap, fileMap) {
  for (const widget of widgets) {
    const data = widget.data || {}
    const widgetId = data.id
    const label = data.label || widgetId

    if (FILE_WIDGET_TYPES.has(widget.widget_type)) {
      if (data.is_required && !fileMap[widgetId]) {
        throw new Error(`الملف "${label}" مطلوب`)
      }
      continue
    }

    if (widget.widget_type === 'check_list') {
      if (data.is_required) {
        assertCheckListValue(widget, fieldMap[widgetId])
      }
      continue
    }

    if (widget.widget_type === 'date_picker') {
      assertDatePickerValue(widget, normalizeFieldValue(fieldMap[widgetId]))
      continue
    }

    if (widget.widget_type === 'employee_picker') {
      const value = normalizeFieldValue(fieldMap[widgetId])
      const selfCardId = Number(
        value && typeof value === 'object'
          ? (value.self_card_id ?? value.id ?? value.value ?? value.key ?? value.user_id)
          : value
      )

      if (data.is_required && (!Number.isInteger(selfCardId) || selfCardId < 1)) {
        throw new Error(`الحقل "${label}" مطلوب ويجب اختيار بطاقة ذاتية`)
      }

      if (
        value !== null &&
        value !== undefined &&
        value !== '' &&
        (!Number.isInteger(selfCardId) || selfCardId < 1)
      ) {
        throw new Error(`الحقل "${label}" يجب أن يكون معرّف بطاقة ذاتية (self_card_id)`)
      }

      continue
    }

    if (!data.is_required) {
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
  assertFilesMatchConfig(normalizedPayload.files || [], configJson)
}

module.exports = {
  assertPayloadAgainstStageConfig,
  collectConfigWidgets,
  buildFilePickerTypeDocMap
}
