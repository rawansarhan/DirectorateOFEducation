'use strict'

function successResponse (res, {
  statusCode = 200,
  message,
  data = {}
}) {
  return res.status(statusCode).json({
    success: true,
    status_code: statusCode,
    message,
    data
  })
}

function errorResponse (res, {
  statusCode = 400,
  message,
  error
}) {
  return res.status(statusCode).json({
    success: false,
    status_code: statusCode,
    message,
    error: error || message,
    data: null
  })
}

module.exports = {
  successResponse,
  errorResponse
}
