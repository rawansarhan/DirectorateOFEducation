'use strict'

function buildSecurityPayload (err) {
  const payload = {
    success: false,
    message: err.message
  }

  if (err.code === 'ACCOUNT_LOCKED' && err.lockedUntil) {
    payload.locked_until = err.lockedUntil
  }

  if (typeof err.remainingAttempts === 'number') {
    payload.remaining_attempts = err.remainingAttempts
  }

  if (err.security?.locked) {
    payload.locked_until = err.security.lockedUntil
  } else if (err.security && typeof err.security.remainingAttempts === 'number') {
    payload.remaining_attempts = err.security.remainingAttempts
  }

  return payload
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

  return res
    .status(getSecurityStatusCode(err, defaultStatus))
    .json(buildSecurityPayload(err))
}

function respondIfOperationGuardError (res, err) {
  if (err.code === 'RATE_LIMIT_EXCEEDED') {
    return res.status(429).json({
      success: false,
      message: err.message,
      code: err.code,
      retry_after_ms: err.retryAfterMs ?? undefined
    })
  }

  if (err.code === 'DUPLICATE_IN_FLIGHT') {
    return res.status(409).json({
      success: false,
      message: err.message,
      code: err.code
    })
  }

  return false
}

module.exports = {
  buildSecurityPayload,
  getSecurityStatusCode,
  respondIfSecurityError,
  respondIfOperationGuardError
}
