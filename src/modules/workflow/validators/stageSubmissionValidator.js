'use strict'

const { Field, File } = require('../../../entities')

const NON_INPUT_WIDGET_TYPES = new Set([
  'heading',
  'divider',
  'info_banner',
  'hidden',
  'readonly',
  'readonly_file',
  'section_header'
])

function collectCurrentWidgets (configJson = {}) {
  const ui = configJson.ui || {}

  if (Array.isArray(ui.widgets) && ui.widgets.length) {
    return ui.widgets.filter(w => w.key && !NON_INPUT_WIDGET_TYPES.has(w.type))
  }

  return (ui.sections || [])
    .filter(section => section.source === 'current' || !section.source)
    .flatMap(section => section.widgets || [])
    .filter(widget => widget.key && !NON_INPUT_WIDGET_TYPES.has(widget.type))
}

async function assertLegacyFieldRules (configJson, fieldMap) {
  const rules = configJson.fields || []

  for (const rule of rules) {
    const field = await Field.findByPk(rule.field_id)

    if (!field) {
      throw new Error(`الحقل غير موجود: ${rule.field_id}`)
    }

    const value = fieldMap[field.field_name]

    if (rule.required && (value === null || value === undefined || value === '')) {
      throw new Error(`الحقل "${field.field_name}" مطلوب`)
    }
  }
}

async function assertLegacyFileRules (configJson, fileMap) {
  const rules = configJson.files || []

  for (const rule of rules) {
    const fileDef = await File.findByPk(rule.file_id)

    if (!fileDef) {
      throw new Error(`الملف غير موجود: ${rule.file_id}`)
    }

    const path = fileMap[fileDef.file_name]

    if (rule.required && !path) {
      throw new Error(`الملف "${fileDef.file_name}" مطلوب`)
    }
  }
}

function assertUiWidgetRules (widgets, fieldMap, fileMap, notes) {
  const notesKey = widgets.find(w => w.type === 'notes')?.key || 'stage_notes'

  for (const widget of widgets) {
    if (!widget.required || widget.read_only) {
      continue
    }

    if (widget.type === 'notes' || widget.key === notesKey) {
      if (!String(notes || fieldMap[notesKey] || '').trim()) {
        throw new Error(`"${widget.label || widget.key}" مطلوب`)
      }
      continue
    }

    if (widget.type === 'file') {
      if (!fileMap[widget.key]) {
        throw new Error(`الملف "${widget.label || widget.key}" مطلوب`)
      }
      continue
    }

    const value = fieldMap[widget.key]

    if (value === null || value === undefined || value === '') {
      throw new Error(`الحقل "${widget.label || widget.key}" مطلوب`)
    }
  }
}

async function assertPayloadAgainstStageConfig (normalizedPayload, configJson = {}, options = {}) {
  const { mode = 'draft' } = options

  if (mode === 'draft') {
    return
  }

  const fieldMap = normalizedPayload.field_map || {}
  const fileMap = normalizedPayload.file_map || {}
  const widgets = collectCurrentWidgets(configJson)

  if (widgets.length) {
    assertUiWidgetRules(
      widgets,
      fieldMap,
      fileMap,
      normalizedPayload.notes
    )
    return
  }

  await assertLegacyFieldRules(configJson, fieldMap)
  await assertLegacyFileRules(configJson, fileMap)
}

module.exports = {
  assertPayloadAgainstStageConfig,
  collectCurrentWidgets
}
