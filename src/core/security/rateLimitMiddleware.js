'use strict'

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

      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.'
      })
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
  windowMs: Number(process.env.RATE_LIMIT_AUTH_WINDOW_MS || 60 * 1000),
  max: Number(process.env.RATE_LIMIT_AUTH_MAX || 20),
  keyPrefix: 'auth',
  keyGenerator: userAwareKey
})

const authBruteForceLimiter = createRateLimiter({
  windowMs: Number(process.env.RATE_LIMIT_AUTH_BRUTE_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.RATE_LIMIT_AUTH_BRUTE_MAX || 10),
  keyPrefix: 'auth-brute',
  keyGenerator: ipOnlyKey
})

const signingChallengeLimiter = createRateLimiter({
  windowMs: Number(process.env.RATE_LIMIT_SIGN_WINDOW_MS || 60 * 1000),
  max: Number(process.env.RATE_LIMIT_SIGN_MAX || 10),
  keyPrefix: 'sign-challenge',
  keyGenerator: userAwareKey
})

const completeTaskLimiter = createRateLimiter({
  windowMs: Number(process.env.RATE_LIMIT_COMPLETE_WINDOW_MS || 60 * 1000),
  max: Number(process.env.RATE_LIMIT_COMPLETE_MAX || 15),
  keyPrefix: 'complete-task',
  keyGenerator: userAwareKey
})

const submitTransactionLimiter = createRateLimiter({
  windowMs: Number(process.env.RATE_LIMIT_SUBMIT_WINDOW_MS || 60 * 1000),
  max: Number(process.env.RATE_LIMIT_SUBMIT_MAX || 10),
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
