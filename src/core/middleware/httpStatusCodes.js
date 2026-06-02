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
  FORBIDDEN: HTTP_STATUS.FORBIDDEN
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
  [HTTP_STATUS.TOO_MANY_REQUESTS]: 'Too Many Requests',
  [HTTP_STATUS.INTERNAL_SERVER_ERROR]: 'Internal Server Error'
})

function resolveHttpStatusFromError (err, defaultStatus = HTTP_STATUS.BAD_REQUEST) {
  if (err?.statusCode) {
    return err.statusCode
  }

  if (err?.code && ERROR_CODE_STATUS[err.code]) {
    return ERROR_CODE_STATUS[err.code]
  }

  if (err?.message === 'Task not found' || err?.message === 'Process instance not found') {
    return HTTP_STATUS.NOT_FOUND
  }

  if (err?.message === 'Transaction not found') {
    return HTTP_STATUS.NOT_FOUND
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
