'use strict'

const {
  enrichFilePickerWidget,
  enrichStageSnapshot,
  isStageFormSnapshot,
  toPublicFileUrl
} = require('../../../../core/utils/filePath')
const { mapTemplatesForHistory } = require('../../services/unifiedFormPayloadService')
const {
  formatTransactionDate,
  parseTransactionDate
} = require('./employeeTaskFormatters')

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

    if (key === 'templates') {
      target.templates = mapTemplatesForHistory(source.templates)
      continue
    }

    if (key === 'completed_at') {
      target.completed_at = formatTransactionDate(source.completed_at) ?? null
      continue
    }

    target[key] = source[key]
  }

  if (source.stage_code != null) target.stage_code = source.stage_code
  if (source.sealed != null) target.sealed = Boolean(source.sealed)
  if (source.content_hash != null) target.content_hash = source.content_hash
  if (source.challenge_id != null) target.challenge_id = source.challenge_id

  return target
}

function buildApplicantSnapshot (transaction = null, rootData = {}) {
  const employeeWidgets = {}

  for (const widget of rootData.widgets || []) {
    const widgetId = widget?.data?.id

    if (widgetId?.startsWith('employee_') || widgetId?.includes('employee')) {
      employeeWidgets[widgetId] = widget.value
    }
  }

  return {
    first_name_employee:
      employeeWidgets.employee_first_name ?? transaction?.first_name ?? '',
    father_name_employee:
      employeeWidgets.employee_father_name ?? transaction?.father_name ?? '',
    last_name_employee:
      employeeWidgets.employee_last_name ?? transaction?.last_name ?? '',
    national_id_employee:
      employeeWidgets.employee_national_id ?? transaction?.national_id ?? '',
    phone_number_employee: transaction?.user?.phone_number ?? ''
  }
}

function buildHistoryStageEntry (stageData = {}) {
  const entry = {
    stage_name: stageData.stage_name || null,
    form_id: stageData.form_id ?? null,
    form_name: stageData.form_name ?? null,
    decision: stageData.decision ?? null,
    note: stageData.note ?? '',
    rejection_reason: stageData.rejection_reason ?? null,
    completed_by: stageData.completed_by ?? null,
    completed_at: formatTransactionDate(stageData.completed_at) ?? null
  }

  if (stageData.stage_code != null) {
    entry.stage_code = stageData.stage_code
  }

  if (stageData.sealed != null) {
    entry.sealed = Boolean(stageData.sealed)
  }

  if (stageData.content_hash != null) {
    entry.content_hash = stageData.content_hash
  }

  if (stageData.challenge_id != null) {
    entry.challenge_id = stageData.challenge_id
  }

  if (Array.isArray(stageData.widgets) && stageData.widgets.length) {
    entry.widgets = enrichWidgets(stageData.widgets)
  }

  if (Array.isArray(stageData.templates) && stageData.templates.length) {
    entry.templates = mapTemplatesForHistory(stageData.templates)
  }

  return entry
}

function isDisplayableHistoryStage (stageData = {}) {
  if (stageData.form_id || stageData.stage_name) {
    return true
  }

  if (Array.isArray(stageData.widgets) && stageData.widgets.length) {
    return true
  }

  if (Array.isArray(stageData.templates) && stageData.templates.length) {
    return true
  }

  return false
}

/**
 * مراحل SERVICE_TASK (مثل GENERATE_PDF) لا تُعرض كمرحلة مستقلة —
 * ملف PDF يظهر داخل templates[].value لمرحلة USER_TASK المرتبطة.
 */
function shouldOmitServiceTaskFromHistory (stageData = {}) {
  const stageName = String(stageData.stage_name || stageData.form_name || '')
    .toUpperCase()

  if (stageName.includes('GENERATE_PDF')) {
    return true
  }

  const hasUserContent =
    (Array.isArray(stageData.widgets) && stageData.widgets.length > 0) ||
    (Array.isArray(stageData.templates) && stageData.templates.length > 0)

  if (hasUserContent) {
    return false
  }

  if (Array.isArray(stageData.actions) && stageData.actions.length > 0) {
    return true
  }

  if (String(stageData.executed_by || '').toLowerCase() === 'system') {
    return true
  }

  return false
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

    if (!isDisplayableHistoryStage(value)) {
      continue
    }

    if (shouldOmitServiceTaskFromHistory(value)) {
      continue
    }

    stages.push(buildHistoryStageEntry(value))
  }

  return stages.sort((a, b) => {
    const dateA = parseTransactionDate(a.completed_at)?.getTime() || 0
    const dateB = parseTransactionDate(b.completed_at)?.getTime() || 0
    return dateA - dateB
  })
}

/**
 * Prepares transaction.data for task-details display:
 * - applicant snapshot
 * - stages[] ordered history (citizen root + completed employee stages)
 */
function formatTransactionHistoryForDisplay (rawData = {}, transaction = null) {
  if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
    return {}
  }

  const cleaned = omitActivityStageKeys(rawData)
  const stages = []
  const applicant = buildApplicantSnapshot(transaction, cleaned)

  if (cleaned.form_id || Array.isArray(cleaned.widgets)) {
    stages.push(buildHistoryStageEntry(copyFormRootFields(cleaned, {})))
  }

  stages.push(...buildCompletedStagesFromData(rawData))

  const display = {
    applicant,
    stages
  }

  if (!stages.length && !Object.keys(applicant).some(key => applicant[key])) {
    return {}
  }

  if (isStageFormSnapshot(display)) {
    return enrichStageSnapshot(display)
  }

  return display
}

/**
 * يملأ حقول PDF داخل templates[].value لمراحل USER_TASK
 * عند غيابها في الـ snapshot (معاملات قديمة أو نجاح outbox متأخر).
 * مراحل SERVICE_TASK / GENERATE_PDF لا تُعرض كمرحلة مستقلة.
 */
function enrichHistoryTemplatesWithDocumentInstances (
  historyData = {},
  documentInstances = []
) {
  const instances = (documentInstances || [])
    .map(doc => (typeof doc.get === 'function' ? doc.get({ plain: true }) : doc))
    .filter(doc => doc?.id && doc.generated_pdf_path)

  if (!Array.isArray(historyData?.stages) || !instances.length) {
    return historyData
  }

  const byTemplateId = new Map()

  for (const doc of instances) {
    const templateId = Number(doc.document_template_id)

    if (Number.isInteger(templateId) && templateId > 0) {
      byTemplateId.set(templateId, doc)
    }
  }

  for (const stage of historyData.stages) {
    if (!Array.isArray(stage.templates) || !stage.templates.length) {
      continue
    }

    stage.templates = stage.templates.map(template => {
      const templateId = Number(template.id_template)
      const matched = byTemplateId.get(templateId)

      if (!matched) {
        return {
          id_template: template.id_template,
          value: template.value && typeof template.value === 'object'
            ? template.value
            : {}
        }
      }

      const pdfMeta = {
        id_document_instance: Number(matched.id),
        generated_pdf_path: matched.generated_pdf_path,
        generated_pdf_url: toPublicFileUrl(matched.generated_pdf_path)
      }

      const prevValue =
        template.value && typeof template.value === 'object'
          ? template.value
          : {}

      return {
        id_template: template.id_template,
        value: {
          ...prevValue,
          ...pdfMeta
        }
      }
    })
  }

  return historyData
}

module.exports = {
  formatTransactionHistoryForDisplay,
  enrichHistoryTemplatesWithDocumentInstances,
  isActivityStageKey,
  buildApplicantSnapshot,
  buildHistoryStageEntry
}
