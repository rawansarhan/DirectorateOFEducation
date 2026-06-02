'use strict'

const ApiResponder = require('../utils/apiResponder')
const {
  HTTP_STATUS,
  resolveHttpStatusFromError
} = require('../middleware/httpStatusCodes')

function getSecurityStatusCode (err, defaultStatus = HTTP_STATUS.UNAUTHORIZED) {
  return resolveHttpStatusFromError(err, defaultStatus)
}

function respondIfSecurityError (res, err, defaultStatus = HTTP_STATUS.UNAUTHORIZED) {
  const isSecurityError =
    err.code === 'ACCOUNT_LOCKED' ||
    typeof err.remainingAttempts === 'number' ||
    err.security

  if (!isSecurityError) {
    return false
  }

  const statusCode = getSecurityStatusCode(err, defaultStatus)

  ApiResponder.errorResponse(
    res,
    err.message,
    statusCode,
    err.code || err.message
  )

  return true
}

function respondIfOperationGuardError (res, err) {
  if (err.code === 'RATE_LIMIT_EXCEEDED') {
    ApiResponder.tooManyRequestsResponse(res, err.message, err.code)
    return true
  }

  if (err.code === 'DUPLICATE_IN_FLIGHT') {
    ApiResponder.conflictResponse(res, err.message, err.code)
    return true
  }

  return false
}

module.exports = {
  getSecurityStatusCode,
  respondIfSecurityError,
  respondIfOperationGuardError
}
