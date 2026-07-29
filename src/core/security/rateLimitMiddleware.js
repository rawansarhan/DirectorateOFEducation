'use strict'

const { getClientIp } = require('./securityConfig')
const ApiResponder = require('../utils/apiResponder')
const {
  RATE_LIMIT_AUTH_WINDOW_MS,
  RATE_LIMIT_AUTH_MAX,
  RATE_LIMIT_AUTH_BRUTE_WINDOW_MS,
  RATE_LIMIT_AUTH_BRUTE_MAX,
  RATE_LIMIT_SIGN_WINDOW_MS,
  RATE_LIMIT_SIGN_MAX,
  RATE_LIMIT_COMPLETE_WINDOW_MS,
  RATE_LIMIT_COMPLETE_MAX,
  RATE_LIMIT_SUBMIT_WINDOW_MS,
  RATE_LIMIT_SUBMIT_MAX,
  RATE_LIMIT_FINAL_DOC_WINDOW_MS,
  RATE_LIMIT_FINAL_DOC_MAX,
  RATE_LIMIT_UPLOAD_WINDOW_MS,
  RATE_LIMIT_UPLOAD_MAX
} = require('../config/env')

function createRateLimiter ({
  windowMs = 60 * 1000,
  max = 10,
  keyPrefix = 'rl',
  keyGenerator = req => req.ip || 'unknown'
}) {
  const hits = new Map()

  setInterval(() => {
    const now = Date.now()

    for (const [key, value] of hits.entries()) {
      if (value.resetAt <= now) {
        hits.delete(key)
      }
    }
  }, windowMs).unref()

  return function rateLimiter (req, res, next) {
    const now = Date.now()
    const key = `${keyPrefix}:${keyGenerator(req)}`
    const current = hits.get(key)

    if (!current || current.resetAt <= now) {
      hits.set(key, {
        count: 1,
        resetAt: now + windowMs
      })

      res.setHeader('X-RateLimit-Limit', String(max))
      res.setHeader('X-RateLimit-Remaining', String(max - 1))
      return next()
    }

    if (current.count >= max) {
      // لا نزيد العداد ولا نمدّد النافذة — القفل ينتهي عند resetAt فقط
      res.setHeader('X-RateLimit-Limit', String(max))
      res.setHeader('X-RateLimit-Remaining', '0')
      const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000))
      res.setHeader('Retry-After', String(retryAfter))

      return ApiResponder.tooManyRequestsResponse(
        res,
        'Too many requests. Please try again later.',
        null,
        { retry_after: retryAfter }
      )
    }

    current.count += 1
    hits.set(key, current)

    res.setHeader('X-RateLimit-Limit', String(max))
    res.setHeader('X-RateLimit-Remaining', String(Math.max(max - current.count, 0)))

    return next()
  }
}

function userAwareKey (req) {
  const userPart = req.user?.id ? `user:${req.user.id}` : 'anon'
  const ipPart = getClientIp(req) || 'unknown'

  return `${userPart}:${ipPart}`
}

function ipOnlyKey (req) {
  return getClientIp(req) || 'unknown'
}

const authSensitiveLimiter = createRateLimiter({
  windowMs: RATE_LIMIT_AUTH_WINDOW_MS,
  max: RATE_LIMIT_AUTH_MAX,
  keyPrefix: 'auth',
  keyGenerator: userAwareKey
})

const authBruteForceLimiter = createRateLimiter({
  windowMs: RATE_LIMIT_AUTH_BRUTE_WINDOW_MS,
  max: RATE_LIMIT_AUTH_BRUTE_MAX,
  keyPrefix: 'auth-brute',
  keyGenerator: ipOnlyKey
})

const signingChallengeLimiter = createRateLimiter({
  windowMs: RATE_LIMIT_SIGN_WINDOW_MS,
  max: RATE_LIMIT_SIGN_MAX,
  keyPrefix: 'sign-challenge',
  keyGenerator: userAwareKey
})

const completeTaskLimiter = createRateLimiter({
  windowMs: RATE_LIMIT_COMPLETE_WINDOW_MS,
  max: RATE_LIMIT_COMPLETE_MAX,
  keyPrefix: 'complete-task',
  keyGenerator: userAwareKey
})

const submitTransactionLimiter = createRateLimiter({
  windowMs: RATE_LIMIT_SUBMIT_WINDOW_MS,
  max: RATE_LIMIT_SUBMIT_MAX,
  keyPrefix: 'submit-transaction',
  keyGenerator: userAwareKey
})

const finalDocumentLimiter = createRateLimiter({
  windowMs: RATE_LIMIT_FINAL_DOC_WINDOW_MS,
  max: RATE_LIMIT_FINAL_DOC_MAX,
  keyPrefix: 'final-document',
  keyGenerator: userAwareKey
})

const uploadFileLimiter = createRateLimiter({
  windowMs: RATE_LIMIT_UPLOAD_WINDOW_MS,
  max: RATE_LIMIT_UPLOAD_MAX,
  keyPrefix: 'upload-file',
  keyGenerator: userAwareKey
})

module.exports = {
  createRateLimiter,
  authSensitiveLimiter,
  authBruteForceLimiter,
  signingChallengeLimiter,
  completeTaskLimiter,
  submitTransactionLimiter,
  finalDocumentLimiter,
  uploadFileLimiter
}
