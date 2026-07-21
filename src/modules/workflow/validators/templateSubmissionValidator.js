'use strict'

/**
 * =============================================================================
 * templateSubmissionValidator — فالديت قوالب الوثائق عند التقديم/الإكمال
 * =============================================================================
 *
 * يتحقق أن widgets المُرسلة لكل قالب تطابق template.config_json تماماً:
 *   - نفس عدد الـ widgets المعرّفة في القالب (لا ناقص ولا زائد)
 *   - نفس widget_type ونفس data.id لكل widget
 *   - قيمة (value) صالحة حسب قواعد كل widget
 *
 * شكل الإدخال لكل قالب:
 *   { id, widgets: [{ widget_type, data: { id }, value }] }
 *
 * المخرجات (تحافظ على العقد الداخلي الحالي حتى لا يتغير الـ response):
 *   { template_id, values: { [widgetId]: value } }
 *
 * يُستخدم في المسار الموحّد:
 *   POST /api/transaction/submit/process/{processId}
 *   POST /api/workflow/tasks/{taskId}/complete
 *   POST /api/transaction/{transactionId}/submit-documents/complete
 */

const documentTemplateRepository =
  require('../../requirements/DocTemp/repositories/documentTemplateRepository')
const {
  validateWidgetValue
} = require('../../transaction/public')
const {
  validateWidgetsBusinessRules
} = require('../stageConfig/validations/stageConfigSchema')

function createTemplateValidationError (message) {
  const error = new Error(message)
  error.code = 'VALIDATION_ERROR'
  return error
}

// يبني خريطة widgets المُرسلة حسب data.id مع رفض المفقود/المكرر
function buildSubmittedWidgetMap (templateId, submittedWidgets) {
  const submittedById = new Map()

  for (const widget of submittedWidgets) {
    const widgetId = widget?.data?.id

    if (!widgetId) {
      throw createTemplateValidationError(
        `كل widget في القالب (id=${templateId}) يجب أن يحتوي data.id`
      )
    }

    if (submittedById.has(widgetId)) {
      throw createTemplateValidationError(
        `معرّف الودجت "${widgetId}" مكرر في القالب (id=${templateId})`
      )
    }

    submittedById.set(widgetId, widget)
  }

  return submittedById
}

// يتحقق أن widgets المُرسلة تطابق template.config_json ويبني خريطة القيم
function validateTemplateWidgetsAgainstConfig (templateId, submittedWidgets, configJson) {
  const configWidgets = Array.isArray(configJson?.widgets) ? configJson.widgets : []

  const businessRulesError = validateWidgetsBusinessRules(configWidgets)

  if (businessRulesError) {
    throw createTemplateValidationError(
      `إعداد القالب (id=${templateId}) غير صالح: ${businessRulesError}`
    )
  }

  const submittedById = buildSubmittedWidgetMap(templateId, submittedWidgets)

  if (submittedById.size !== configWidgets.length) {
    throw createTemplateValidationError(
      `widgets المُرسلة للقالب (id=${templateId}) لا تطابق template.config_json — ` +
        `المتوقع ${configWidgets.length} ودجت والمُرسل ${submittedById.size}`
    )
  }

  const values = {}

  for (const configWidget of configWidgets) {
    const widgetId = configWidget.data.id
    const submitted = submittedById.get(widgetId)

    if (!submitted) {
      throw createTemplateValidationError(
        `الودجت "${widgetId}" مفقود من widgets المُرسلة للقالب (id=${templateId})`
      )
    }

    if (submitted.widget_type !== configWidget.widget_type) {
      throw createTemplateValidationError(
        `نوع الودجت "${widgetId}" لا يطابق template.config_json للقالب (id=${templateId})`
      )
    }

    const valueError = validateWidgetValue(configWidget, submitted.value)

    if (valueError) {
      throw createTemplateValidationError(`${valueError} (القالب id=${templateId})`)
    }

    values[widgetId] = submitted.value
  }

  return values
}

// يتحقق من كل القوالب المُرسلة ويعيدها بالشكل الداخلي { template_id, values }
async function validateAndNormalizeTemplates (templates = []) {
  const normalized = []
  const seenTemplateIds = new Set()

  for (const item of templates || []) {
    const templateId = Number(item?.id ?? item?.template_id)

    if (!Number.isInteger(templateId) || templateId <= 0) {
      throw createTemplateValidationError('معرّف القالب (id) غير صالح')
    }

    if (seenTemplateIds.has(templateId)) {
      throw createTemplateValidationError(`القالب (id=${templateId}) مُرسل أكثر من مرة`)
    }

    seenTemplateIds.add(templateId)

    const template = await documentTemplateRepository.findById(templateId)

    if (!template) {
      throw createTemplateValidationError(
        `قالب الوثيقة (id=${templateId}) غير موجود`
      )
    }

    const submittedWidgets = Array.isArray(item?.widgets) ? item.widgets : []

    const values = validateTemplateWidgetsAgainstConfig(
      templateId,
      submittedWidgets,
      template.config_json || {}
    )

    normalized.push({ template_id: templateId, values })
  }

  return normalized
}

  function emptyStoredWidgetValue (widget) {
    if (widget?.widget_type === 'file_picker') {
      return widget?.data?.allow_multiple === false ? '' : []
    }

    if (widget?.widget_type === 'check_list') {
      return []
    }

    return ''
  }

/**
 * يعيد بناء templates[] بالشكل المتوقع في الطلب ({ id, widgets[] })
 * من الشكل المخزّن في transaction.data ({ id_template, value }).
 * يُستخدم عند auto-complete لمرحلة AUTH بعد submit.
 */
async function rebuildTemplateItemsForResubmission (storedTemplates = []) {
  const rebuilt = []

  for (const item of storedTemplates || []) {
    const templateId = Number(
      item?.id_template ?? item?.id ?? item?.template_id
    )

    if (!Number.isInteger(templateId) || templateId <= 0) {
      continue
    }

    const template = await documentTemplateRepository.findById(templateId)

    if (!template) {
      throw createTemplateValidationError(
        `قالب الوثيقة (id=${templateId}) غير موجود`
      )
    }

    const values = item.values ?? item.value ?? {}
    const configWidgets = Array.isArray(template.config_json?.widgets)
      ? template.config_json.widgets
      : []

    rebuilt.push({
      id: templateId,
      widgets: configWidgets.map(widget => {
        const widgetId = widget?.data?.id
        const hasStoredValue =
          widgetId != null &&
          Object.prototype.hasOwnProperty.call(values, widgetId)

        return {
          widget_type: widget.widget_type,
          data: widget.data,
          value: hasStoredValue
            ? values[widgetId]
            : emptyStoredWidgetValue(widget)
        }
      })
    })
  }

  return rebuilt
}

module.exports = {
  validateAndNormalizeTemplates,
  validateTemplateWidgetsAgainstConfig,
  rebuildTemplateItemsForResubmission
}
