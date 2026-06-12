'use strict'

const SUBMIT_PAYLOAD_ALLOWED_FIELDS = [
  'stage_name',
  'fields',
  'files',
  'templates',
  'decision',
  'note',
  'expected_version'
]

const SUBMIT_UNKNOWN_FIELD_HINTS = {
  variables:
    'variables مخصّص لإكمال مهمة الموظف POST /api/workflow/tasks/{taskId}/complete — في submit استخدم fields[] (key = data.id) و decision',
  signature:
    'signature مطلوب فقط عند إكمال مهمة موظف مع توقيع USB',
  schema_version:
    'schema_version لا يُرسل في submit — يُستخدم في complete فقط',
  employee:
    'employee لا يُرسل في submit — حقل خاص بإكمال مهمة الموظف',
  actions:
    'actions لا تُرسل في submit',
  notes:
    'استخدم note بدلاً من notes',
  widgets:
    'لا ترسل widgets في submit — أرسل fields و files حيث key = data.id من stage_config (widgets يُستخدم في upsertDraft فقط)',
  data:
    'لا ترسل data في submit — أرسل fields و files مباشرة في جسم الطلب (data يُستخدم في upsertDraft فقط)'
}

const submitFieldItemMessages = {
  'any.required': 'fields[].key مطلوب — يجب أن يساوي widget.data.id من stage_config',
  'string.base': 'fields[].key يجب أن يكون نصاً',
  'string.max': 'fields[].key أطول من 128 حرفاً'
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
        message: `الحقل "${unknownKey}" غير مسموح في POST /api/transaction/submit/{processId} — ${hint}`
      }
    }

    return {
      field: unknownKey,
      message:
        `الحقل "${unknownKey}" غير مسموح في POST /api/transaction/submit/{processId} — ` +
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
  submitFieldItemMessages,
  submitPayloadRootMessages,
  formatSubmitTransactionJoiError
}
