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

function resolveWorkflowStatusCode (error, defaultStatus = HTTP_STATUS.BAD_REQUEST) {
  if (error.code === 'VALIDATION_ERROR') {
    return HTTP_STATUS.BAD_REQUEST
  }

  if (error.code === 'VERSION_CONFLICT') {
    return HTTP_STATUS.CONFLICT
  }

  const conflictCodes = [
    'TASK_LOCKED_BY_ANOTHER',
    'TASK_LOCK_REQUIRED',
    'TASK_LOCK_EXPIRED',
    'VERSION_CONFLICT',
    'DUPLICATE_IN_FLIGHT'
  ]

  if (conflictCodes.includes(error.code)) {
    return HTTP_STATUS.CONFLICT
  }

  return resolveHttpStatusFromError(error, defaultStatus)
}

function sendWorkflowSuccess (res, data = null, message = '', statusCode = HTTP_STATUS.OK) {
  return ApiResponder.successResponse(res, data, message, statusCode)
}

function sendWorkflowError (res, error, defaultStatus = HTTP_STATUS.BAD_REQUEST) {
  if (respondIfSecurityError(res, error, defaultStatus)) {
    return
  }

  if (respondIfOperationGuardError(res, error)) {
    return
  }

  const statusCode = resolveWorkflowStatusCode(error, defaultStatus)

  return ApiResponder.errorResponse(
    res,
    error.message,
    statusCode,
    error.code || error.message
  )
}

module.exports = {
  sendWorkflowSuccess,
  sendWorkflowError,
  resolveWorkflowStatusCode,
  HTTP_STATUS
}
