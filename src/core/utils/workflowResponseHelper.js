'use strict'

const ApiResponder = require('../utils/apiResponder')
const {
  respondIfSecurityError,
  respondIfOperationGuardError
} = require('../security/securityResponseHelper')
const {
  HTTP_STATUS,
  resolveHttpStatusFromError
} = require('../middleware/httpStatusCodes')
const { formatClientErrorMessage, enrichAxiosErrorForWorkflow } = require('./errorMessageHelper')

const WORKFLOW_ERROR_CATALOG = {
  'Task not found': {
    message: 'المهمة غير موجودة أو لم تعد نشطة في Camunda',
    code: 'TASK_NOT_FOUND',
    status: HTTP_STATUS.NOT_FOUND
  },
  'Process instance not found': {
    message: 'مثيل سير العمل غير موجود',
    code: 'PROCESS_INSTANCE_NOT_FOUND',
    status: HTTP_STATUS.NOT_FOUND
  },
  'Transaction not found': {
    message: 'المعاملة غير موجودة',
    code: 'TRANSACTION_NOT_FOUND',
    status: HTTP_STATUS.NOT_FOUND
  },
  'Stage not found': {
    message: 'مرحلة سير العمل غير موجودة',
    code: 'STAGE_NOT_FOUND',
    status: HTTP_STATUS.NOT_FOUND
  },
  'Digital signature is required. Call POST /tasks/:taskId/signing-challenge first.': {
    message: 'التوقيع الرقمي مطلوب. أنشئ تحدي التوقيع أولاً عبر POST /tasks/{taskId}/signing-challenge',
    code: 'SIGNATURE_REQUIRED',
    status: HTTP_STATUS.BAD_REQUEST
  },
  'Digital signature is not required for this task': {
    message: 'هذه المهمة لا تتطلب توقيعاً رقمياً',
    code: 'SIGNATURE_NOT_REQUIRED',
    status: HTTP_STATUS.BAD_REQUEST
  },
  'Signing challenge not found': {
    message: 'تحدي التوقيع غير موجود أو منتهي',
    code: 'SIGNING_CHALLENGE_NOT_FOUND',
    status: HTTP_STATUS.BAD_REQUEST
  },
  'Signing challenge does not belong to this user': {
    message: 'تحدي التوقيع لا يخص هذا المستخدم',
    code: 'SIGNING_CHALLENGE_FORBIDDEN',
    status: HTTP_STATUS.FORBIDDEN
  },
  'Signing challenge already used (replay attack)': {
    message: 'تم استخدام تحدي التوقيع مسبقاً — أنشئ تحدياً جديداً',
    code: 'SIGNING_CHALLENGE_USED',
    status: HTTP_STATUS.BAD_REQUEST
  },
  'Signing challenge expired': {
    message: 'انتهت صلاحية تحدي التوقيع — أنشئ تحدياً جديداً',
    code: 'SIGNING_CHALLENGE_EXPIRED',
    status: HTTP_STATUS.BAD_REQUEST
  },
  'decision does not match the signed signing challenge': {
    message: 'قرار التوقيع (decision) لا يطابق ما وُقّع في تحدي التوقيع',
    code: 'SIGNING_DECISION_MISMATCH',
    status: HTTP_STATUS.BAD_REQUEST
  },
  'stage snapshot does not match the signed signing challenge': {
    message: 'بيانات المرحلة لا تطابق اللقطة التي وُقّعت عبر USB — أعد signing-challenge بنفس widgets ثم complete',
    code: 'SIGNING_SNAPSHOT_MISMATCH',
    status: HTTP_STATUS.BAD_REQUEST
  },
  'stage snapshot hash is required to verify signing challenge': {
    message: 'هاش لقطة المرحلة مطلوب للتحقق من التوقيع — أرسل نفس widgets عند complete',
    code: 'SIGNING_SNAPSHOT_REQUIRED',
    status: HTTP_STATUS.BAD_REQUEST
  },
  'Invalid digital signature': {
    message: 'التوقيع الرقمي غير صالح — تحقق من USB والمفتاح',
    code: 'INVALID_SIGNATURE',
    status: HTTP_STATUS.BAD_REQUEST
  },
  'stage_name does not match the current workflow stage': {
    message: 'stage_name لا يطابق المرحلة الحالية للمهمة',
    code: 'STAGE_NAME_MISMATCH',
    status: HTTP_STATUS.BAD_REQUEST
  },
  'rejection_reason is required when decision is reject': {
    message: 'rejection_reason مطلوب عند decision = reject',
    code: 'REJECTION_REASON_REQUIRED',
    status: HTTP_STATUS.BAD_REQUEST
  },
  'decision is required when completing a task with digital signature': {
    message: 'decision مطلوب (approve / reject) عند إكمال مهمة تتطلب توقيعاً',
    code: 'DECISION_REQUIRED',
    status: HTTP_STATUS.BAD_REQUEST
  },
  'لا يمكن تعديل بيانات مرحلة مكتملة ومختومة': {
    message: 'لا يمكن تعديل بيانات مرحلة مكتملة ومختومة',
    code: 'STAGE_SEALED',
    status: HTTP_STATUS.CONFLICT
  },
  'Too many requests — please wait before retrying': {
    message: 'تم تجاوز حد الطلبات — انتظر قليلاً ثم أعد المحاولة',
    code: 'RATE_LIMITED',
    status: HTTP_STATUS.TOO_MANY_REQUESTS
  },
  'تم تجاوز حد الطلبات — انتظر قليلاً ثم أعد المحاولة': {
    message: 'تم تجاوز حد الطلبات — انتظر قليلاً ثم أعد المحاولة',
    code: 'RATE_LIMITED',
    status: HTTP_STATUS.TOO_MANY_REQUESTS
  },
  'Duplicate request is already in progress': {
    message: 'طلب مكرر قيد التنفيذ — انتظر اكتمال الطلب السابق',
    code: 'DUPLICATE_IN_FLIGHT',
    status: HTTP_STATUS.CONFLICT
  },
  'ENGINE-02004': {
    message:
      'مسار Camunda غير محدد — تأكد أن variables.decision يطابق شروط الـ gateway في BPMN (مثلاً: الطلب مقبول / الطلب مرفوض، أو over_50 / under_50 حسب العملية)',
    code: 'CAMUNDA_GATEWAY_ERROR',
    status: HTTP_STATUS.BAD_REQUEST
  }
}

const CONFLICT_ERROR_MESSAGES = {
  TASK_LOCKED_BY_ANOTHER: 'هذه المعاملة قد تم استلامها من قبل موظف آخر',
  TASK_LOCK_REQUIRED: 'يجب استلام المعاملة أولاً عبر POST /api/workflow/tasks/{taskId}/pickup.',
  TASK_LOCK_EXPIRED: 'انتهت صلاحية قفل المعاملة. استلمها مجدداً عبر POST /api/workflow/tasks/{taskId}/pickup.',
  TASK_LOCK_NOT_HELD: 'لا يوجد قفل نشط على هذه المهمة.',
  TASK_LOCK_NOT_OWNER: 'لا يمكنك إلغاء استلام معاملة مقفولة لموظف آخر.',
  VERSION_CONFLICT: 'تعارض في إصدار المعاملة — أعد تحميل البيانات وأرسل expected_version الصحيح.',
  DUPLICATE_IN_FLIGHT: WORKFLOW_ERROR_CATALOG['Duplicate request is already in progress'].message,
  IDEMPOTENT_REPLAY: 'تمت معالجة هذا الطلب مسبقاً (idempotent replay).'
}

function normalizeWorkflowError (error) {
  if (typeof error === 'string') {
    return enrichWorkflowError({ message: error, code: null })
  }

  if (error && typeof error === 'object') {
    return enrichWorkflowError(error)
  }

  return {
    message: 'حدث خطأ غير متوقع',
    code: 'INTERNAL_ERROR',
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR
  }
}

function enrichWorkflowError (error = {}) {
  if (error.expose && error.message) {
    return {
      message: error.message,
      code: error.code || null,
      status: error.statusCode || null
    }
  }

  const axiosEnriched = enrichAxiosErrorForWorkflow(error)

  if (axiosEnriched) {
    return axiosEnriched
  }

  const remoteMessage =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    ''
  const rawMessage = String(error.message || remoteMessage || '')

  if (
    rawMessage.includes('ENGINE-02004') ||
    String(remoteMessage).includes('ENGINE-02004')
  ) {
    return {
      message: WORKFLOW_ERROR_CATALOG['ENGINE-02004'].message,
      code: WORKFLOW_ERROR_CATALOG['ENGINE-02004'].code,
      status: WORKFLOW_ERROR_CATALOG['ENGINE-02004'].status
    }
  }

  const catalogEntry = WORKFLOW_ERROR_CATALOG[error.message]

  if (catalogEntry) {
    return {
      message: catalogEntry.message,
      code: error.code || catalogEntry.code,
      status: catalogEntry.status
    }
  }

  // STAGE_SEALED message includes stage_code: "... (STAGE_X)"
  if (
    error.code === 'STAGE_SEALED' ||
    String(error.message || '').startsWith('لا يمكن تعديل بيانات مرحلة مكتملة ومختومة')
  ) {
    return {
      message: error.message || WORKFLOW_ERROR_CATALOG['لا يمكن تعديل بيانات مرحلة مكتملة ومختومة'].message,
      code: 'STAGE_SEALED',
      status: HTTP_STATUS.CONFLICT
    }
  }

  if (error.code === 'CONFLICT') {
    return {
      message: error.message || 'تعارض في البيانات',
      code: 'CONFLICT',
      status: HTTP_STATUS.CONFLICT
    }
  }

  if (error.code && CONFLICT_ERROR_MESSAGES[error.code]) {
    return {
      message: CONFLICT_ERROR_MESSAGES[error.code],
      code: error.code,
      status: HTTP_STATUS.CONFLICT
    }
  }

  return {
    message: error.message || 'حدث خطأ في الطلب',
    code: error.code || null,
    status: null
  }
}

function resolveWorkflowErrorMessage (error, normalized) {
  if (normalized?.status && normalized?.message) {
    return normalized.message
  }

  if (error?.expose && error?.message) {
    return error.message
  }

  return (
    formatClientErrorMessage(error) ||
    normalized.message ||
    'حدث خطأ في الطلب'
  )
}

function resolveWorkflowStatusCode (error, defaultStatus = HTTP_STATUS.BAD_REQUEST) {
  const normalized = normalizeWorkflowError(error)

  if (normalized.status) {
    return normalized.status
  }

  if (error?.statusCode) {
    return error.statusCode
  }

  if (normalized.code === 'VALIDATION_ERROR') {
    return HTTP_STATUS.BAD_REQUEST
  }

  if (normalized.code === 'VERSION_CONFLICT') {
    return HTTP_STATUS.CONFLICT
  }

  const conflictCodes = [
    'TASK_LOCKED_BY_ANOTHER',
    'TASK_LOCK_REQUIRED',
    'TASK_LOCK_EXPIRED',
    'TASK_LOCK_NOT_HELD',
    'VERSION_CONFLICT',
    'DUPLICATE_IN_FLIGHT',
    'IDEMPOTENT_REPLAY',
    'STAGE_SEALED'
  ]

  if (conflictCodes.includes(normalized.code)) {
    return HTTP_STATUS.CONFLICT
  }

  if (normalized.code === 'TASK_LOCK_NOT_OWNER') {
    return HTTP_STATUS.FORBIDDEN
  }

  return resolveHttpStatusFromError(normalized, defaultStatus)
}

/**
 * نجاح: { success: true, status_code, message, data }
 */
function sendWorkflowSuccess (res, data = null, message = '', statusCode = HTTP_STATUS.OK) {
  return ApiResponder.successResponse(res, data, message, statusCode)
}

/**
 * خطأ: { success: false, status_code, message, error, data: null }
 */
function sendWorkflowError (res, error, defaultStatus = HTTP_STATUS.BAD_REQUEST) {
  const normalized = normalizeWorkflowError(error)

  if (respondIfSecurityError(res, normalized, defaultStatus)) {
    return
  }

  if (respondIfOperationGuardError(res, normalized)) {
    return
  }

  const statusCode = resolveWorkflowStatusCode(error, defaultStatus)
  const message = resolveWorkflowErrorMessage(error, normalized)
  const errorCode =
    normalized.code ||
    error.code ||
    (statusCode < HTTP_STATUS.INTERNAL_SERVER_ERROR
      ? 'REQUEST_ERROR'
      : 'INTERNAL_ERROR')

  return ApiResponder.error(res, {
    message,
    statusCode,
    data:
      (error?.data && typeof error.data === 'object' ? error.data : null) ||
      (error?.details && typeof error.details === 'object' ? error.details : null),
    error: errorCode
  })
}

function workflowValidationError (message) {
  return { message, code: 'VALIDATION_ERROR' }
}

module.exports = {
  sendWorkflowSuccess,
  sendWorkflowError,
  workflowValidationError,
  normalizeWorkflowError,
  enrichWorkflowError,
  resolveWorkflowStatusCode,
  HTTP_STATUS
}
