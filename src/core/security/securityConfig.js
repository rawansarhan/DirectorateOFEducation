'use strict'

const MAX_FAILED_ATTEMPTS = Number(process.env.SECURITY_MAX_FAILED_ATTEMPTS || 5)
const LOCK_DURATION_MS = Number(process.env.SECURITY_LOCK_DURATION_MS || 15 * 60 * 1000)

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
