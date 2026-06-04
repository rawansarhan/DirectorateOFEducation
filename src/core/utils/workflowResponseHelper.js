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

function normalizeWorkflowError (error) {
  if (typeof error === 'string') {
    return { message: error, code: null }
  }

  if (error && typeof error === 'object') {
    return {
      message: error.message || 'خطأ في الطلب',
      code: error.code || null
    }
  }

  return { message: 'Error', code: null }
}

function resolveWorkflowStatusCode (error, defaultStatus = HTTP_STATUS.BAD_REQUEST) {
  const normalized = normalizeWorkflowError(error)

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
    'VERSION_CONFLICT',
    'DUPLICATE_IN_FLIGHT',
    'IDEMPOTENT_REPLAY'
  ]

  if (conflictCodes.includes(normalized.code)) {
    return HTTP_STATUS.CONFLICT
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

  const statusCode = resolveWorkflowStatusCode(normalized, defaultStatus)
  const errorField =
    normalized.code ||
    (statusCode < HTTP_STATUS.INTERNAL_SERVER_ERROR
      ? 'REQUEST_ERROR'
      : 'INTERNAL_ERROR')

  return ApiResponder.errorResponse(
    res,
    normalized.message,
    statusCode,
    errorField
  )
}

function workflowValidationError (message) {
  return { message, code: 'VALIDATION_ERROR' }
}

module.exports = {
  sendWorkflowSuccess,
  sendWorkflowError,
  workflowValidationError,
  normalizeWorkflowError,
  resolveWorkflowStatusCode,
  HTTP_STATUS
}
