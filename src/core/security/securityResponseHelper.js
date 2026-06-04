'use strict'

const ApiResponder = require('../utils/apiResponder')

function buildSecurityExtra (err) {
  const extra = {}

  if (err.code === 'ACCOUNT_LOCKED' && err.lockedUntil) {
    extra.locked_until = err.lockedUntil
  }

  if (typeof err.remainingAttempts === 'number') {
    extra.remaining_attempts = err.remainingAttempts
  }

  if (err.security?.locked) {
    extra.locked_until = err.security.lockedUntil
  } else if (err.security && typeof err.security.remainingAttempts === 'number') {
    extra.remaining_attempts = err.security.remainingAttempts
  }

  return extra
}

function getSecurityStatusCode (err, defaultStatus = 401) {
  if (err.code === 'ACCOUNT_LOCKED') {
    return 423
  }

  if (err.security?.locked) {
    return 423
  }

  return defaultStatus
}

function respondIfSecurityError (res, err, defaultStatus = 401) {
  const isSecurityError =
    err.code === 'ACCOUNT_LOCKED' ||
    typeof err.remainingAttempts === 'number' ||
    err.security

  if (!isSecurityError) {
    return false
  }

  ApiResponder.error(res, {
    message: err.message,
    statusCode: getSecurityStatusCode(err, defaultStatus),
    extra: buildSecurityExtra(err)
  })

  return true
}

module.exports = {
  buildSecurityExtra,
  getSecurityStatusCode,
  respondIfSecurityError
}
