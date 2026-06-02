'use strict'

const ApiResponder = require('../utils/apiResponder')
const { getClientIp } = require('./securityConfig')

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
      res.setHeader('X-RateLimit-Limit', String(max))
      res.setHeader('X-RateLimit-Remaining', '0')
      res.setHeader('Retry-After', String(Math.ceil((current.resetAt - now) / 1000)))

      return ApiResponder.tooManyRequestsResponse(
        res,
        'Too many requests. Please try again later.',
        'RATE_LIMIT_EXCEEDED'
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
  RATE_LIMIT_SUBMIT_MAX
} = require('../config/env')

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

module.exports = {
  createRateLimiter,
  authSensitiveLimiter,
  authBruteForceLimiter,
  signingChallengeLimiter,
  completeTaskLimiter,
  submitTransactionLimiter
}
