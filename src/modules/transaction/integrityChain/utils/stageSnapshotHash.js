'use strict'

/**
 * لقطة مرحلة كانونية للهاش:
 * widgets (id + value) + templates + decision + note + assignments
 * بدون completed_by / digital_signature / مسارات التسجيل اللاحقة.
 *
 * قيم file_picker تُختزل إلى path وحده حتى يطابق هاش
 * تحدي USB هاش البيانات المخزّنة بعد تسجيل الملفات.
 */

const PDF_META_VALUE_KEYS = new Set([
  'id_document_instance',
  'generated_pdf_path',
  'generated_pdf_url'
])

function stripPdfMetaFromValueMap (values = {}) {
  if (!values || typeof values !== 'object' || Array.isArray(values)) {
    return values || {}
  }

  const cleaned = {}

  for (const [key, value] of Object.entries(values)) {
    if (PDF_META_VALUE_KEYS.has(key)) {
      continue
    }
    cleaned[key] = value
  }

  return cleaned
}

/**
 * الملف يُختزل إلى path فقط.
 *
 * type_doc_id مُستبعد عمداً: وقت إنشاء تحدي التوقيع لم تُسجَّل الملفات بعد
 * (القيمة string أو بلا type_doc_id)، ويُضاف لاحقاً في
 * registerTransactionFiles قبل الختم. لو دخل في اللقطة الكانونية لاختلف
 * هاش التوقيع عن هاش الختم حتماً، فينكسر verifyIntegrityChain.
 * الـ path وحده يعرّف الملف وهو ما وقّع عليه المستخدم فعلاً.
 */
function normalizeFileToken (entry) {
  if (typeof entry === 'string') {
    return { path: entry }
  }

  if (!entry || typeof entry !== 'object') {
    return { path: null }
  }

  return {
    path: entry.path ?? entry.url ?? null
  }
}

function canonicalizeWidgetValue (widgetType, value) {
  if (widgetType === 'file_picker') {
    const items = Array.isArray(value)
      ? value
      : (value == null || value === '' ? [] : [value])

    return items.map(normalizeFileToken)
  }

  return value
}

function canonicalizeWidgets (widgets = []) {
  if (!Array.isArray(widgets)) {
    return []
  }

  return widgets.map(widget => ({
    widget_type: widget?.widget_type ?? null,
    id: widget?.data?.id ?? widget?.id ?? widget?.key ?? null,
    value: canonicalizeWidgetValue(widget?.widget_type, widget?.value)
  }))
}

function widgetsToValueMap (widgets = []) {
  const value = {}

  for (const widget of canonicalizeWidgets(widgets)) {
    if (widget.id == null) {
      continue
    }

    value[widget.id] = widget.value
  }

  return stripPdfMetaFromValueMap(value)
}

function canonicalizeTemplates (templates = []) {
  if (!Array.isArray(templates)) {
    return []
  }

  return templates.map(template => {
    const id = template.id_template ?? template.id ?? template.template_id ?? null

    if (Array.isArray(template.widgets) && template.widgets.length) {
      return {
        id,
        value: widgetsToValueMap(template.widgets)
      }
    }

    return {
      id,
      value: stripPdfMetaFromValueMap(template.value ?? template.values ?? {})
    }
  })
}

function canonicalizeAssignments (assignments) {
  if (!Array.isArray(assignments)) {
    return null
  }

  return assignments.map(item => ({
    organization_id: item.organization_id ?? null,
    department_id: item.department_id ?? null,
    role_id: item.role_id ?? null
  }))
}

function buildCanonicalStageSnapshot (stageData = {}, extras = {}) {
  const source = stageData && typeof stageData === 'object' && !Array.isArray(stageData)
    ? stageData
    : {}

  const snapshot = {
    form_id: extras.form_id ?? source.form_id ?? null,
    form_name: extras.form_name ?? source.form_name ?? null,
    widgets: canonicalizeWidgets(extras.widgets ?? source.widgets),
    templates: canonicalizeTemplates(extras.templates ?? source.templates),
    decision: extras.decision ?? source.decision ?? null,
    note: extras.note ?? source.note ?? ''
  }

  const assignments = canonicalizeAssignments(
    extras.assignments ?? source.assignments
  )

  if (assignments) {
    snapshot.assignments = assignments
  }

  return snapshot
}

module.exports = {
  buildCanonicalStageSnapshot,
  canonicalizeWidgets,
  canonicalizeTemplates
}
