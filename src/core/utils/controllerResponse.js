'use strict'

const ApiResponder = require('./apiResponder')
const {
  respondIfSecurityError,
  respondIfOperationGuardError
} = require('../security/securityResponseHelper')
const {
  HTTP_STATUS,
  resolveHttpStatusFromError
} = require('../middleware/httpStatusCodes')

function sendControllerError (res, err, defaultStatus = HTTP_STATUS.BAD_REQUEST) {
  if (respondIfSecurityError(res, err, defaultStatus)) {
    return true
  }

  if (respondIfOperationGuardError(res, err)) {
    return true
  }

  const statusCode = resolveHttpStatusFromError(err, defaultStatus)

  return ApiResponder.errorResponse(
    res,
    err.message,
    statusCode,
    err.code || err.message
  )
}

function sendOk (res, data = null, message = '') {
  return ApiResponder.okResponse(res, data, message)
}

function sendCreated (res, data = null, message = '') {
  return ApiResponder.createdResponse(res, data, message)
}

module.exports = {
  sendOk,
  sendCreated,
  sendControllerError,
  resolveHttpStatusFromError
}
