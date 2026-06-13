'use strict'

const { STRICT_FORM_UNKNOWN_HINTS } = require('../services/unifiedFormPayloadService')

const SUBMIT_PAYLOAD_ALLOWED_FIELDS = [
  'form_id',
  'form_name',
  'widgets',
  'templates',
  'note',
  'expected_version'
]

const SUBMIT_UNKNOWN_FIELD_HINTS = {
  ...STRICT_FORM_UNKNOWN_HINTS,
  decision:
    'decision لا يُرسل في submit — يُثبت تلقائياً على السيرفر',
  signature:
    'signature مطلوب فقط عند إكمال مهمة موظف POST /api/workflow/tasks/{taskId}/complete',
  notes: 'استخدم note بدلاً من notes'
}

const submitPayloadRootMessages = {
  'object.unknown': 'الحقل {#label} غير مسموح في تقديم المعاملة (submit)'
}

function describeSubmitJoiDetail (detail) {
  const field = detail.path?.length ? detail.path.join('.') : 'body'

  if (detail.type === 'object.unknown') {
    const unknownKey = String(detail.context?.key ?? detail.path?.[0] ?? field)
    const hint = SUBMIT_UNKNOWN_FIELD_HINTS[unknownKey]

    if (hint) {
      return {
        field: unknownKey,
        message: `الحقل "${unknownKey}" غير مسموح في POST /api/transaction/submit/{transactionId} — ${hint}`
      }
    }

    return {
      field: unknownKey,
      message:
        `الحقل "${unknownKey}" غير مسموح في POST /api/transaction/submit/{transactionId} — ` +
        `الحقول المقبولة: ${SUBMIT_PAYLOAD_ALLOWED_FIELDS.join(', ')}`
    }
  }

  const text =
    detail.context?.message ||
    detail.message ||
    'قيمة غير صالحة'

  return { field, message: text }
}

function formatSubmitTransactionJoiError (error) {
  if (!error?.details?.length) {
    return {
      message: 'بيانات تقديم المعاملة غير صالحة',
      details: [],
      allowed_fields: SUBMIT_PAYLOAD_ALLOWED_FIELDS
    }
  }

  const details = error.details.map(describeSubmitJoiDetail)

  return {
    message: `بيانات تقديم المعاملة غير صالحة — ${details.map(item => item.message).join(' | ')}`,
    details,
    allowed_fields: SUBMIT_PAYLOAD_ALLOWED_FIELDS
  }
}

module.exports = {
  SUBMIT_PAYLOAD_ALLOWED_FIELDS,
  SUBMIT_UNKNOWN_FIELD_HINTS,
  submitPayloadRootMessages,
  formatSubmitTransactionJoiError
}
