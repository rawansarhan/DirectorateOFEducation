'use strict'

const MESSAGES = {
  INVALID_PROCESS_ID: 'معرّف العملية غير صالح',
  INVALID_TRANSACTION_ID: 'معرّف المعاملة غير صالح',
  INVALID_DRAFT_ID: 'معرّف المسودة غير صالح',
  PROCESS_NOT_FOUND: 'العملية المطلوبة غير موجودة',
  PROCESS_INACTIVE: 'العملية غير نشطة حالياً ولا يمكن إنشاء مسودة لها',
  DRAFT_NOT_FOUND: 'لا توجد مسودة لهذه المعاملة',
  DRAFT_INACTIVE: 'المسودة غير مفعّلة',
  TRANSACTION_NOT_FOUND: 'المعاملة غير موجودة',
  UNAUTHORIZED: 'لا تملك صلاحية الوصول إلى هذه المعاملة',
  SUBMIT_NOT_DRAFT: 'لا يمكن تقديم المعاملة إلا وهي في حالة مسودة',
  TRANSACTION_IN_PROGRESS: 'لديك معاملة قيد التنفيذ لهذه العملية — لا يمكن إنشاء تقديم جديد',
  VALIDATION_ERROR: 'بيانات الطلب غير صالحة',
  WORKFLOW_UNAVAILABLE: 'تعذّر الاتصال بخدمة سير العمل، حاول لاحقاً',
  WORKFLOW_START_FAILED: 'فشل بدء سير العمل — لم يُحفظ التقديم، أعد المحاولة',
  INTERNAL_ERROR: 'حدث خطأ أثناء معالجة المعاملة، حاول لاحقاً',
  DRAFT_CREATED: 'تم إنشاء المسودة بنجاح',
  DRAFT_UPDATED: 'تم تحديث بيانات الهوية للمسودة بنجاح',
  DRAFT_RETRIEVED: 'تم جلب المسودة بنجاح',
  DRAFT_UPSERT_CREATED: 'تم إنشاء مسودة جديدة بنجاح',
  DRAFT_UPSERT_UPDATED: 'تم تحديث المسودة الحالية بنجاح',
  TRANSACTION_RETRIEVED: 'تم جلب المعاملة بنجاح',
  TRANSACTION_SUBMITTED: 'تم تقديم المعاملة بنجاح',
  TRANSACTIONS_LIST_RETRIEVED: 'تم جلب معاملاتك بنجاح'
}

function createTransactionError (code, detail, meta = null) {
  const message = detail || MESSAGES[code] || MESSAGES.INTERNAL_ERROR
  const err = new Error(message)
  err.code = code

  if (meta?.details) {
    err.details = meta.details
  }

  if (meta?.validation) {
    err.validation = meta.validation
  }

  return err
}

function mapErrorToArabic (error) {
  if (!error) {
    return MESSAGES.INTERNAL_ERROR
  }

  if (error.code && MESSAGES[error.code]) {
    return error.message || MESSAGES[error.code]
  }

  const msg = String(error.message || '')

  if (msg.includes('Process not found')) {
    return MESSAGES.PROCESS_NOT_FOUND
  }
  if (msg.includes('Process is not active')) {
    return MESSAGES.PROCESS_INACTIVE
  }
  if (msg.includes('Draft not found')) {
    return MESSAGES.DRAFT_NOT_FOUND
  }
  if (msg.includes('Transaction not found')) {
    return MESSAGES.TRANSACTION_NOT_FOUND
  }
  if (msg.includes('Unauthorized')) {
    return MESSAGES.UNAUTHORIZED
  }
  if (msg.includes('Only draft')) {
    return MESSAGES.SUBMIT_NOT_DRAFT
  }

  return msg || MESSAGES.INTERNAL_ERROR
}

function httpStatusForError (error) {
  const msg = String(error?.message || '')

  if (error?.code === 'UNAUTHORIZED' || msg.includes('Unauthorized')) {
    return 403
  }
  if (
    error?.code === 'PROCESS_NOT_FOUND' ||
    error?.code === 'DRAFT_NOT_FOUND' ||
    error?.code === 'TRANSACTION_NOT_FOUND' ||
    error?.code === 'NOT_FOUND' ||
    msg.includes('not found')
  ) {
    return 404
  }
  if (
    error?.code === 'PROCESS_INACTIVE' ||
    error?.code === 'SUBMIT_NOT_DRAFT' ||
    error?.code === 'TRANSACTION_IN_PROGRESS' ||
    error?.code === 'VALIDATION_ERROR' ||
    msg.includes('not active') ||
    msg.includes('Only draft')
  ) {
    return 400
  }

  if (error?.code === 'WORKFLOW_START_FAILED') {
    return 502
  }

  return 500
}

module.exports = {
  MESSAGES,
  createTransactionError,
  mapErrorToArabic,
  httpStatusForError
}
