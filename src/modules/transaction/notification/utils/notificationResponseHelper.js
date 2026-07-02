'use strict'

const ApiResponder = require('../../../../core/utils/apiResponder')
const {
  HTTP_STATUS,
  resolveHttpStatusFromError
} = require('../../../../core/middleware/httpStatusCodes')
const { resolveNotificationError } = require('./notificationErrors')

function resolveNotificationStatusCode (error, normalized) {
  if (normalized.status) {
    return normalized.status
  }

  return resolveHttpStatusFromError(error, HTTP_STATUS.BAD_REQUEST)
}

/** Success: { success: true, status_code, message, data } */
function sendNotificationSuccess (res, data = null, message = '', statusCode = HTTP_STATUS.OK) {
  return ApiResponder.success(res, { data, message, statusCode })
}

/** Error: { success: false, status_code, message, error, data: null } */
function sendNotificationError (res, error, defaultStatus = HTTP_STATUS.BAD_REQUEST) {
  const normalized = resolveNotificationError(error)
  const statusCode = resolveNotificationStatusCode(error, normalized)
  const errorCode =
    normalized.code ||
    (statusCode < HTTP_STATUS.INTERNAL_SERVER_ERROR ? 'REQUEST_ERROR' : 'INTERNAL_ERROR')

  return ApiResponder.error(res, {
    message: normalized.message,
    statusCode,
    data: null,
    error: errorCode
  })
}

module.exports = {
  sendNotificationSuccess,
  sendNotificationError,
  HTTP_STATUS
}
