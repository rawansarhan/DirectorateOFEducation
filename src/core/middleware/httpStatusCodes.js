'use strict'

/**
 * ============================================================
 * HTTP Status Codes — المصدر المركزي لكل status_code في APIs
 * ============================================================
 *
 * شكل الاستجابة الموحّد:
 *   نجاح: { success: true,  status_code, message, data }
 *   خطأ:  { success: false, status_code, message, error, data: null }
 *
 * استخدم HTTP_STATUS.* دائماً — لا تكتب أرقاماً مباشرة في controllers/services.
 */

const HTTP_STATUS = Object.freeze({
  /** 200 — طلب ناجح مع بيانات (GET / POST / PUT / PATCH) */
  OK: 200,

  /** 201 — تم إنشاء مورد جديد (CREATE) */
  CREATED: 201,

  /** 204 — نجاح بدون body */
  NO_CONTENT: 204,

  /** 400 — بيانات الطلب غير صحيحة (validation، حقول ناقصة، UUID غير صالح) */
  BAD_REQUEST: 400,

  /** 401 — غير مصادق (token مفقود، منتهي، أو PIN/توقيع خاطئ) */
  UNAUTHORIZED: 401,

  /** 403 — مصادق لكن بدون صلاحية أو بدون roles */
  FORBIDDEN: 403,

  /** 404 — المورد غير موجود (معاملة، مهمة، مؤسسة، ...) */
  NOT_FOUND: 404,

  /** 409 — تعارض (expected_version، task lock، duplicate in-flight، idempotency) */
  CONFLICT: 409,

  /** 422 — البيانات مقبولة شكلاً لكن مرفوضة منطقياً (سلسلة توقيع مزورة، HEAD_MISMATCH) */
  UNPROCESSABLE_ENTITY: 422,

  /** 423 — الحساب مقفل مؤقتاً بعد محاولات PIN/توقيع فاشلة */
  LOCKED: 423,

  /** 429 — تجاوز حد الطلبات (rate limit) */
  TOO_MANY_REQUESTS: 429,

  /** 500 — خطأ داخلي غير متوقع في السيرفر */
  INTERNAL_SERVER_ERROR: 500
})

/**
 * ربط error.code بـ status_code — يُستخدم في resolveHttpStatusFromError
 */
const ERROR_CODE_STATUS = Object.freeze({
  VALIDATION_ERROR: HTTP_STATUS.BAD_REQUEST,
  VERSION_CONFLICT: HTTP_STATUS.CONFLICT,
  DUPLICATE_IN_FLIGHT: HTTP_STATUS.CONFLICT,
  TASK_LOCKED_BY_ANOTHER: HTTP_STATUS.CONFLICT,
  TASK_LOCK_REQUIRED: HTTP_STATUS.CONFLICT,
  TASK_LOCK_EXPIRED: HTTP_STATUS.CONFLICT,
  IDEMPOTENT_REPLAY: HTTP_STATUS.CONFLICT,
  ACCOUNT_LOCKED: HTTP_STATUS.LOCKED,
  RATE_LIMIT_EXCEEDED: HTTP_STATUS.TOO_MANY_REQUESTS,
  HEAD_MISMATCH: HTTP_STATUS.UNPROCESSABLE_ENTITY,
  NO_TOKEN: HTTP_STATUS.UNAUTHORIZED,
  TOKEN_EXPIRED: HTTP_STATUS.UNAUTHORIZED,
  INVALID_TOKEN: HTTP_STATUS.UNAUTHORIZED,
  UNAUTHORIZED: HTTP_STATUS.UNAUTHORIZED,
  NO_ROLES: HTTP_STATUS.FORBIDDEN,
  NO_ROLE_IDS: HTTP_STATUS.FORBIDDEN,
  NO_PERMISSIONS: HTTP_STATUS.FORBIDDEN,
  FORBIDDEN: HTTP_STATUS.FORBIDDEN,
  TASK_NOT_FOUND: HTTP_STATUS.NOT_FOUND,
  PROCESS_INSTANCE_NOT_FOUND: HTTP_STATUS.NOT_FOUND,
  TRANSACTION_NOT_FOUND: HTTP_STATUS.NOT_FOUND,
  TYPE_DOC_NOT_FOUND: HTTP_STATUS.NOT_FOUND,
  NOTIFICATION_NOT_FOUND: HTTP_STATUS.NOT_FOUND,
  NOT_FOUND: HTTP_STATUS.NOT_FOUND,
  DUPLICATE_NAME: HTTP_STATUS.CONFLICT,
  DUPLICATE_CODE: HTTP_STATUS.CONFLICT
})

/**
 * رسائل HTTP الافتراضية عند غياب message مخصص
 */
const HTTP_STATUS_MESSAGE = Object.freeze({
  [HTTP_STATUS.OK]: 'OK',
  [HTTP_STATUS.CREATED]: 'Created',
  [HTTP_STATUS.NO_CONTENT]: 'No Content',
  [HTTP_STATUS.BAD_REQUEST]: 'Bad Request',
  [HTTP_STATUS.UNAUTHORIZED]: 'Unauthorized',
  [HTTP_STATUS.FORBIDDEN]: 'Forbidden',
  [HTTP_STATUS.NOT_FOUND]: 'Not Found',
  [HTTP_STATUS.CONFLICT]: 'Conflict',
  [HTTP_STATUS.UNPROCESSABLE_ENTITY]: 'Unprocessable Entity',
  [HTTP_STATUS.LOCKED]: 'Locked',
  [HTTP_STATUS.TOO_MANY_REQUESTS]: 'تم تجاوز حد الطلبات — يرجى المحاولة لاحقاً',
  [HTTP_STATUS.INTERNAL_SERVER_ERROR]: 'Internal Server Error'
})

const WORKFLOW_NOT_FOUND_MESSAGES = new Set([
  'Task not found',
  'Process instance not found',
  'Transaction not found',
  'Process not found',
  'Stage not found',
  'Signing challenge not found'
])

const WORKFLOW_BAD_REQUEST_MESSAGES = new Set([
  'decision does not match the signed signing challenge',
  'decision is required to verify signing challenge',
  'decision is required when completing a task with digital signature',
  'Signing challenge does not belong to this user',
  'Signing challenge already used (replay attack)',
  'Signing challenge expired',
  'Digital signature is not required for this task',
  'Digital key is not active',
  'Invalid digital signature',
  'stage_name does not match current task stage',
  'Process is inactive',
  'Digital signature is required. Call POST /tasks/:taskId/signing-challenge first.',
  'لا يوجد مفتاح رقمي مرتبط بهذا الموظف'
])

function resolveHttpStatusFromError (err, defaultStatus = HTTP_STATUS.BAD_REQUEST) {
  if (err?.statusCode) {
    return err.statusCode
  }

  if (err?.status) {
    return err.status
  }

  if (err?.isAxiosError && err.response?.status) {
    return err.response.status >= 500
      ? HTTP_STATUS.INTERNAL_SERVER_ERROR
      : HTTP_STATUS.BAD_REQUEST
  }

  if (
    err?.name === 'SequelizeUniqueConstraintError' ||
    err?.name === 'SequelizeForeignKeyConstraintError'
  ) {
    return HTTP_STATUS.CONFLICT
  }

  if (
    err?.name === 'SequelizeValidationError' ||
    err?.name === 'SequelizeDatabaseError'
  ) {
    return HTTP_STATUS.BAD_REQUEST
  }

  if (err?.type === 'entity.parse.failed' || err?.name === 'SyntaxError') {
    return HTTP_STATUS.BAD_REQUEST
  }

  if (err?.code && ERROR_CODE_STATUS[err.code]) {
    return ERROR_CODE_STATUS[err.code]
  }

  const message = err?.message

  if (message && WORKFLOW_NOT_FOUND_MESSAGES.has(message)) {
    return HTTP_STATUS.NOT_FOUND
  }

  if (message && WORKFLOW_BAD_REQUEST_MESSAGES.has(message)) {
    return HTTP_STATUS.BAD_REQUEST
  }

  if (
    message &&
    (message.includes('signing challenge') ||
      message.includes('Digital signature') ||
      message.includes('required'))
  ) {
    return HTTP_STATUS.BAD_REQUEST
  }

  return defaultStatus
}

function getDefaultMessageForStatus (statusCode) {
  return HTTP_STATUS_MESSAGE[statusCode] || 'Error'
}

function createHttpError (message, statusCode = HTTP_STATUS.BAD_REQUEST, code = null) {
  const error = new Error(message)
  error.statusCode = statusCode

  if (code) {
    error.code = code
  }

  return error
}

function attachHttpStatus (error, statusCode, code = null) {
  error.statusCode = statusCode

  if (code) {
    error.code = code
  }

  return error
}

module.exports = {
  HTTP_STATUS,
  ERROR_CODE_STATUS,
  HTTP_STATUS_MESSAGE,
  resolveHttpStatusFromError,
  getDefaultMessageForStatus,
  createHttpError,
  attachHttpStatus
}
