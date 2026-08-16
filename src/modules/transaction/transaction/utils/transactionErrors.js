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
  NOT_TRANSACTION_OWNER: 'هذه المعاملة ليست لك — لا يمكنك الاطلاع على طلب ليس لك',
  FINAL_DOCUMENT_NOT_FOUND: 'عذراً، لا يوجد ملف نهائي لطلبك بعد',
  SUBMIT_NOT_DRAFT: 'لا يمكن تقديم المعاملة إلا وهي في حالة مسودة',
  EMPLOYEE_FORBIDDEN_CITIZEN_ROUTE:
    'هذا المسار مخصّص للمواطن فقط. كموظف، قدّم معاملتك عبر مسار الموظف: أنشئ تحدي التوقيع أولاً عبر POST /api/transaction/process/{processId}/submit-documents/signing-challenge ثم وقّع وأرسل التقديم مع التوقيع',
  CITIZEN_SIGNATURE_NOT_ALLOWED:
    'التوقيع الرقمي غير مسموح في تقديم المواطن — احذف حقل signature من الطلب',
  SIGNATURE_REQUIRED: 'التوقيع الرقمي مطلوب للموظف — أنشئ تحدي التوقيع أولاً',
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
  TRANSACTIONS_LIST_RETRIEVED: 'تم جلب معاملاتك بنجاح',
  TRANSACTION_COUNTS_RETRIEVED: 'تم جلب أعداد معاملاتك بنجاح',
  FIRST_STAGE_RETRIEVED: 'تم جلب محتوى المرحلة الأولى بنجاح',
  FIRST_STAGE_NOT_FOUND: 'لا توجد مرحلة أولى لهذه العملية',
  FIRST_STAGE_CONTENT_NOT_FOUND: 'لا يوجد محتوى محفوظ للمرحلة الأولى',
  GENERATE_PDF_NOT_READY:
    'تعذّر إكمال المعاملة — توليد PDF لم يكتمل بعد',
  FINAL_DOCUMENT_NOT_READY:
    'الوثيقة النهائية غير جاهزة للدمج بعد',
  SEALED_SNAPSHOT_TAMPERED:
    'تم التلاعب بلقطة مرحلة مختومة — لا يمكن توليد الوثيقة',
  INTEGRITY_CHAIN_FORGED:
    'سلسلة النزاهة مزوّرة أو تالفة — لا يمكن توليد الوثيقة النهائية',
  SEALED_TEMPLATE_VALUES_MISSING:
    'قيم القالب غير موجودة في اللقطات المختومة'
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

  if (
    error?.code === 'UNAUTHORIZED' ||
    error?.code === 'FORBIDDEN' ||
    error?.code === 'NOT_TRANSACTION_OWNER' ||
    error?.code === 'EMPLOYEE_FORBIDDEN_CITIZEN_ROUTE' ||
    msg.includes('Unauthorized')
  ) {
    return 403
  }
  if (
    error?.code === 'PROCESS_NOT_FOUND' ||
    error?.code === 'DRAFT_NOT_FOUND' ||
    error?.code === 'TRANSACTION_NOT_FOUND' ||
    error?.code === 'FIRST_STAGE_NOT_FOUND' ||
    error?.code === 'FIRST_STAGE_CONTENT_NOT_FOUND' ||
    error?.code === 'FINAL_DOCUMENT_NOT_FOUND' ||
    error?.code === 'NOT_FOUND' ||
    msg.includes('not found')
  ) {
    return 404
  }
  if (
    error?.code === 'PROCESS_INACTIVE' ||
    error?.code === 'SUBMIT_NOT_DRAFT' ||
    error?.code === 'SIGNATURE_REQUIRED' ||
    error?.code === 'CITIZEN_SIGNATURE_NOT_ALLOWED' ||
    error?.code === 'TRANSACTION_IN_PROGRESS' ||
    error?.code === 'VALIDATION_ERROR' ||
    error?.code === 'FINAL_DOCUMENT_NOT_READY' ||
    error?.code === 'SEALED_TEMPLATE_VALUES_MISSING' ||
    error?.code === 'SIGNING_SNAPSHOT_MISMATCH' ||
    error?.code === 'ENCRYPTED_PAYLOAD_INVALID' ||
    error?.code === 'DECRYPTION_FAILED' ||
    error?.code === 'DECRYPTED_JSON_INVALID' ||
    error?.code === 'SUBMIT_AES_KEY_INVALID' ||
    msg.includes('not active') ||
    msg.includes('Only draft')
  ) {
    return 400
  }

  if (
    error?.code === 'SEALED_SNAPSHOT_TAMPERED' ||
    error?.code === 'INTEGRITY_CHAIN_FORGED' ||
    error?.code === 'HEAD_MISMATCH'
  ) {
    return 422
  }

  if (error?.code === 'STAGE_SEALED') {
    return 409
  }

  if (error?.code === 'SUBMIT_AES_KEY_MISSING') {
    return 503
  }

  if (
    error?.code === 'GENERATE_PDF_NOT_READY' ||
    error?.statusCode === 409
  ) {
    return 409
  }

  if (error?.code === 'WORKFLOW_START_FAILED') {
    return 500
  }

  return 500
}

module.exports = {
  MESSAGES,
  createTransactionError,
  mapErrorToArabic,
  httpStatusForError
}
