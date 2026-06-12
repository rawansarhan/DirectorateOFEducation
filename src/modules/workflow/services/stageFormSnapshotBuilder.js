'use strict'

const FILE_WIDGET_TYPE = 'file_picker'

const FIELD_WIDGET_TYPES = new Set([
  'text_field',
  'date_picker',
  'dropdown',
  'radio_group',
  'check_list'
])

function buildFieldMap (payload = {}, configJson = null) {
  if (payload.field_map && typeof payload.field_map === 'object') {
    return { ...payload.field_map }
  }

  const map = {}

  for (const field of payload.fields || []) {
    const key = field?.key ?? field?.id

    if (key != null) {
      map[key] = field.value
    }
  }

  const variables = payload.variables || {}

  for (const [key, value] of Object.entries(variables)) {
    if (!Object.prototype.hasOwnProperty.call(map, key)) {
      map[key] = value
    }
  }

  for (const widget of configJson?.widgets || []) {
    const widgetId = widget?.data?.id

    if (!widgetId || Object.prototype.hasOwnProperty.call(map, widgetId)) {
      continue
    }

    if (widgetId === 'decision') {
      const resolved =
        variables.action ??
        variables.decision ??
        payload.decision ??
        null

      if (resolved != null && resolved !== '') {
        map[widgetId] = resolved
      }
    }
  }

  return map
}

function buildFilesByWidgetId (files = []) {
  const byId = new Map()

  for (const file of files) {
    const widgetId = file?.key ?? file?.id

    if (!widgetId) {
      continue
    }

    if (!byId.has(widgetId)) {
      byId.set(widgetId, [])
    }

    byId.get(widgetId).push(file)
  }

  return byId
}

function normalizeValueById (valueById) {
  if (!valueById) {
    return null
  }

  if (valueById instanceof Map) {
    return valueById
  }

  if (typeof valueById === 'object') {
    return new Map(Object.entries(valueById))
  }

  return null
}

function emptyFileWidgetValue (widget) {
  return widget?.data?.allow_multiple === false ? '' : []
}

function emptyFieldWidgetValue (widget) {
  if (widget?.widget_type === 'check_list') {
    return []
  }

  return ''
}

function toStoredFileValue (file) {
  if (typeof file === 'string') {
    return file
  }

  if (!file || typeof file !== 'object') {
    return file
  }

  return {
    path: file.path ?? null,
    url: file.url ?? null,
    document_id: file.document_id ?? null,
    type_doc_id: file.type_doc_id ?? null,
    type_doc: file.type_doc ?? null,
    original_name: file.original_name ?? null,
    mime_type: file.mime_type ?? null
  }
}

function resolveWidgetValue (configWidget, fieldMap, filesByWidgetId, valueById) {
  const widgetId = configWidget?.data?.id

  if (valueById?.has(widgetId)) {
    return valueById.get(widgetId)
  }

  if (configWidget.widget_type === FILE_WIDGET_TYPE) {
    const registered = filesByWidgetId.get(widgetId) || []

    if (registered.length) {
      return registered.map(toStoredFileValue)
    }

    return emptyFileWidgetValue(configWidget)
  }

  if (Object.prototype.hasOwnProperty.call(fieldMap, widgetId)) {
    return fieldMap[widgetId]
  }

  if (FIELD_WIDGET_TYPES.has(configWidget.widget_type)) {
    return emptyFieldWidgetValue(configWidget)
  }

  return null
}

/**
 * Builds a stage form snapshot for transaction.data / transaction_history:
 * { form_id, form_name, widgets: [{ widget_type, data, value }] }
 * Values come from submit/complete payload (fields/files) or explicit value_by_id.
 */
function buildStageFormSnapshot (configJson = {}, payload = {}) {
  const fieldMap = buildFieldMap(payload, configJson)
  const filesByWidgetId = buildFilesByWidgetId(payload.files)
  const valueById = normalizeValueById(payload.value_by_id)

  const widgets = (configJson.widgets || []).map(configWidget => ({
    widget_type: configWidget.widget_type,
    data: configWidget.data,
    value: resolveWidgetValue(
      configWidget,
      fieldMap,
      filesByWidgetId,
      valueById
    )
  }))

  return {
    form_id: configJson.form_id ?? null,
    form_name: configJson.form_name ?? null,
    widgets
  }
}

function extractFieldsFilesFromWidgets (widgets = []) {
  const fields = []
  const files = []

  for (const widget of widgets) {
    const key = widget?.data?.id

    if (!key) {
      continue
    }

    if (widget.widget_type === FILE_WIDGET_TYPE) {
      const rawValue = widget.value
      const entries = Array.isArray(rawValue)
        ? rawValue
        : (rawValue === null || rawValue === undefined || rawValue === '')
            ? []
            : [rawValue]

      for (const entry of entries) {
        if (typeof entry === 'string') {
          files.push({ key, path: entry })
          continue
        }

        if (entry && typeof entry === 'object') {
          files.push({
            key,
            path: entry.path,
            url: entry.url ?? null,
            type_doc_id: entry.type_doc_id ?? null,
            type_doc: entry.type_doc ?? null,
            document_id: entry.document_id ?? null,
            original_name: entry.original_name ?? null
          })
        }
      }

      continue
    }

    fields.push({ key, value: widget.value })
  }

  return { fields, files }
}

module.exports = {
  buildStageFormSnapshot,
  extractFieldsFilesFromWidgets,
  buildFieldMap,
  buildFilesByWidgetId
}
