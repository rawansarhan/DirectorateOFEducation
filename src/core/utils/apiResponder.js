'use strict'

const {
  HTTP_STATUS,
  getDefaultMessageForStatus
} = require('../middleware/httpStatusCodes')

class ApiResponder {
  static successResponse (res, data = null, message = '', statusCode = HTTP_STATUS.OK) {
    return res.status(statusCode).json({
      success: true,
      status_code: statusCode,
      message: message || getDefaultMessageForStatus(statusCode),
      data
    })
  }

  static errorResponse (res, message = '', statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, error = null) {
    const resolvedMessage = message || getDefaultMessageForStatus(statusCode)

    return res.status(statusCode).json({
      success: false,
      status_code: statusCode,
      message: resolvedMessage,
      error: error || resolvedMessage,
      data: null
    })
  }

  static okResponse (res, data = null, message = '') {
    return this.successResponse(res, data, message, HTTP_STATUS.OK)
  }

  static createdResponse (res, data = null, message = '') {
    return this.successResponse(res, data, message, HTTP_STATUS.CREATED)
  }

  static noContentResponse (res, message = '') {
    return this.successResponse(res, null, message, HTTP_STATUS.NO_CONTENT)
  }

  static badRequestResponse (res, message = '', error = null) {
    return this.errorResponse(res, message, HTTP_STATUS.BAD_REQUEST, error)
  }

  static unauthorizedResponse (res, message = '', error = null) {
    return this.errorResponse(res, message, HTTP_STATUS.UNAUTHORIZED, error)
  }

  static forbiddenResponse (res, message = '', error = null) {
    return this.errorResponse(res, message, HTTP_STATUS.FORBIDDEN, error)
  }

  static notFoundResponse (res, message = '', error = null) {
    return this.errorResponse(res, message, HTTP_STATUS.NOT_FOUND, error)
  }

  static conflictResponse (res, message = '', error = null) {
    return this.errorResponse(res, message, HTTP_STATUS.CONFLICT, error)
  }

  static unprocessableResponse (res, message = '', error = null) {
    return this.errorResponse(res, message, HTTP_STATUS.UNPROCESSABLE_ENTITY, error)
  }

  static lockedResponse (res, message = '', error = null) {
    return this.errorResponse(res, message, HTTP_STATUS.LOCKED, error)
  }

  static tooManyRequestsResponse (res, message = '', error = null) {
    return this.errorResponse(res, message, HTTP_STATUS.TOO_MANY_REQUESTS, error)
  }

  static internalErrorResponse (res, message = '', error = null) {
    return this.errorResponse(res, message, HTTP_STATUS.INTERNAL_SERVER_ERROR, error)
  }
}

module.exports = ApiResponder
