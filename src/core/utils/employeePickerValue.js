'use strict'

/**
 * قيمة employee_picker:
 * {
 *   self_card_id: number,        // إلزامي (= employee_self_cards.id)
 *   path_self_card?: string      // اختياري — مسار ملف CV بلاحقة .pdf
 * }
 */

function isBlank (value) {
  return value === null || value === undefined || value === ''
}

function getExtension (filePath) {
  const parts = String(filePath).split('.')
  return parts.length > 1 ? parts.pop().toLowerCase() : ''
}

function isEmployeePickerEmpty (value) {
  if (isBlank(value)) {
    return true
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    const id = value.self_card_id ?? value.id
    return isBlank(id)
  }

  return false
}

/**
 * يحوّل القيمة لشكل موحّد أو يرمي خطأ وصفي عبر إرجاع { error }.
 */
function normalizeEmployeePickerValue (value) {
  if (isEmployeePickerEmpty(value)) {
    return { value: null, error: null }
  }

  let selfCardId
  let pathSelfCard = null

  if (typeof value === 'object' && !Array.isArray(value)) {
    selfCardId = Number(value.self_card_id ?? value.id)
    if (!isBlank(value.path_self_card)) {
      pathSelfCard = String(value.path_self_card).trim()
    }
  } else {
    selfCardId = Number(value)
  }

  if (!Number.isInteger(selfCardId) || selfCardId < 1) {
    return {
      value: null,
      error: 'يجب أن يحتوي value على self_card_id صالح (معرّف البطاقة الذاتية)'
    }
  }

  if (pathSelfCard != null) {
    if (getExtension(pathSelfCard) !== 'pdf') {
      return {
        value: null,
        error: 'path_self_card يجب أن يكون ملف PDF'
      }
    }
  }

  const normalized = { self_card_id: selfCardId }
  if (pathSelfCard != null) {
    normalized.path_self_card = pathSelfCard
  }

  return { value: normalized, error: null }
}

function validateEmployeePickerValue (data = {}, value, label) {
  const required = data.is_required === true

  if (isEmployeePickerEmpty(value)) {
    return required ? `"${label}" مطلوب — أرسل self_card_id` : null
  }

  const { error } = normalizeEmployeePickerValue(value)
  if (error) {
    return `"${label}" ${error}`
  }

  return null
}

function extractSelfCardId (value) {
  const { value: normalized } = normalizeEmployeePickerValue(value)
  return normalized?.self_card_id ?? null
}

module.exports = {
  isEmployeePickerEmpty,
  normalizeEmployeePickerValue,
  validateEmployeePickerValue,
  extractSelfCardId
}
