'use strict'

const {
  SECURITY_MAX_FAILED_ATTEMPTS,
  SECURITY_LOCK_DURATION_MS
} = require('../config/env')

const MAX_FAILED_ATTEMPTS = SECURITY_MAX_FAILED_ATTEMPTS
const LOCK_DURATION_MS = SECURITY_LOCK_DURATION_MS

function getClientIp (req) {
  const forwarded = req.headers['x-forwarded-for']

  if (typeof forwarded === 'string' && forwarded.length) {
    return forwarded.split(',')[0].trim()
  }

  return req.ip || req.socket?.remoteAddress || null
}

function getClientMeta (req) {
  return {
    ip: getClientIp(req),
    userAgent: req.headers['user-agent'] || null,
    idempotencyKey:
      req.headers['idempotency-key'] ||
      req.headers['x-idempotency-key'] ||
      null
  }
}

module.exports = {
  MAX_FAILED_ATTEMPTS,
  LOCK_DURATION_MS,
  getClientIp,
  getClientMeta
}
