'use strict'

/**
 * تنظيف payload قبل التحقق — complete / submit
 *
 * - fields / files / templates / variables اختيارية ([] أو عناصر)
 * - العناصر الفارغة {} تُزال من المصفوفات
 * - files تحتاج key + path + type_doc_id
 * - templates تحتاج id أو template_id
 */

const { pickTypeDocIdFromObject } = require('../../../core/utils/typeDocId')

function isNonEmptyString (value) {
  return typeof value === 'string' && value.trim().length > 0
}

function sanitizeFields (fields = []) {
  if (!Array.isArray(fields)) {
    return []
  }

  return fields.filter(item => item && isNonEmptyString(item.key))
}

function sanitizeFiles (files = []) {
  if (!Array.isArray(files)) {
    return []
  }

  return files.filter(item => {
    if (!item || !isNonEmptyString(item.key) || !isNonEmptyString(item.path)) {
      return false
    }

    return Boolean(pickTypeDocIdFromObject(item))
  })
}

function sanitizeTemplates (templates = []) {
  if (!Array.isArray(templates)) {
    return []
  }

  return templates.filter(item => {
    if (!item) {
      return false
    }

    const templateId = item.template_id ?? item.id
    return Number.isInteger(Number(templateId)) && Number(templateId) > 0
  })
}

function sanitizeVariables (variables) {
  if (variables == null || typeof variables !== 'object' || Array.isArray(variables)) {
    return {}
  }

  const sanitized = { ...variables }

  if (!isNonEmptyString(sanitized.decision)) {
    delete sanitized.decision
  }

  return sanitized
}

function sanitizeOptionalSubmissionPayload (payload = {}, options = {}) {
  const { includeVariables = true } = options

  const sanitized = {
    ...payload,
    fields: sanitizeFields(payload.fields),
    files: sanitizeFiles(payload.files),
    templates: sanitizeTemplates(payload.templates)
  }

  if (includeVariables) {
    sanitized.variables = sanitizeVariables(payload.variables)
  }

  return sanitized
}

module.exports = {
  sanitizeFields,
  sanitizeFiles,
  sanitizeTemplates,
  sanitizeVariables,
  sanitizeOptionalSubmissionPayload
}
