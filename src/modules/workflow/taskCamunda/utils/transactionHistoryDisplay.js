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
const { resolveStagePdfFields } = require('./generatedPdfHistory')

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

  if (Array.isArray(stageData.widgets) && stageData.widgets.length) {
    entry.widgets = enrichWidgets(stageData.widgets)
  }

  if (Array.isArray(stageData.templates) && stageData.templates.length) {
    entry.templates = mapTemplatesForHistory(stageData.templates)
  }

  const pdfFields = resolveStagePdfFields(stageData)

  if (pdfFields) {
    entry.id_document_instance = pdfFields.id_document_instance
    entry.generated_pdf_path = pdfFields.generated_pdf_path
    entry.generated_pdf_url = pdfFields.generated_pdf_url
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
 * يملأ حقول PDF على مراحل GENERATE_PDF عند غيابها في الـ snapshot
 * (مثلاً معاملات قديمة أو نجاح outbox متأخر).
 * قوالب USER_TASK تبقى id_template + value فقط.
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
  const unused = new Set(instances.map(doc => Number(doc.id)))

  for (const doc of instances) {
    const templateId = Number(doc.document_template_id)

    if (Number.isInteger(templateId) && templateId > 0) {
      byTemplateId.set(templateId, doc)
    }
  }

  for (const stage of historyData.stages) {
    if (stage.id_document_instance && stage.generated_pdf_path) {
      unused.delete(Number(stage.id_document_instance))
      continue
    }

    const stageName = String(stage.stage_name || stage.form_name || '')
      .toUpperCase()
    const looksLikeGeneratePdf =
      stageName.includes('GENERATE_PDF') ||
      stage.id_document_instance != null ||
      stage.generated_pdf_path != null

    if (!looksLikeGeneratePdf) {
      continue
    }

    let matched = null

    if (stage.id_document_instance) {
      matched = instances.find(
        doc => Number(doc.id) === Number(stage.id_document_instance)
      )
    }

    if (!matched && byTemplateId.size === 1) {
      matched = [...byTemplateId.values()][0]
    }

    if (!matched && unused.size === 1) {
      const onlyId = [...unused][0]
      matched = instances.find(doc => Number(doc.id) === onlyId)
    }

    if (!matched) {
      continue
    }

    stage.id_document_instance = Number(matched.id)
    stage.generated_pdf_path = matched.generated_pdf_path
    stage.generated_pdf_url = toPublicFileUrl(matched.generated_pdf_path)
    unused.delete(Number(matched.id))
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
