'use strict'

const MIN_INTERVAL_MS = Number(process.env.OPERATION_MIN_INTERVAL_MS || 2000)
const IDEMPOTENCY_TTL_MS = Number(process.env.IDEMPOTENCY_TTL_MS || 24 * 60 * 60 * 1000)
const CLEANUP_INTERVAL_MS = Number(process.env.OPERATION_GUARD_CLEANUP_MS || 60 * 1000)

class OperationGuardService {
  constructor () {
    this.lastRequestAt = new Map()
    this.inFlight = new Map()
    this.idempotencyResults = new Map()

    setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS).unref()
  }

  cleanup () {
    const now = Date.now()

    for (const [key, value] of this.idempotencyResults.entries()) {
      if (value.expiresAt <= now) {
        this.idempotencyResults.delete(key)
      }
    }

    for (const [key, startedAt] of this.inFlight.entries()) {
      if (now - startedAt > IDEMPOTENCY_TTL_MS) {
        this.inFlight.delete(key)
      }
    }
  }

  buildRateKey (scope, userId, resourceId) {
    return `${scope}:rate:${userId}:${resourceId}`
  }

  buildIdempotencyKey (scope, userId, idempotencyKey) {
    return `${scope}:idem:${userId}:${idempotencyKey}`
  }

  assertMinInterval (rateKey, minIntervalMs) {
    const lastAt = this.lastRequestAt.get(rateKey)

    if (!lastAt) {
      return
    }

    const elapsed = Date.now() - lastAt

    if (elapsed < minIntervalMs) {
      const error = new Error(
        `Too many requests. Wait ${Math.ceil((minIntervalMs - elapsed) / 1000)}s before retrying.`
      )
      error.code = 'RATE_LIMIT_EXCEEDED'
      error.retryAfterMs = minIntervalMs - elapsed
      throw error
    }
  }

  assertNotInFlight (key, message) {
    if (this.inFlight.has(key)) {
      const error = new Error(message)
      error.code = 'DUPLICATE_IN_FLIGHT'
      throw error
    }
  }

  /**
   * @returns {{ replay: boolean, result?: *, context?: object }}
   */
  begin ({
    scope,
    userId,
    resourceId,
    idempotencyKey = null,
    minIntervalMs = MIN_INTERVAL_MS
  }) {
    if (!userId || !resourceId) {
      return { replay: false, context: null }
    }

    const rateKey = this.buildRateKey(scope, userId, resourceId)
    this.assertMinInterval(rateKey, minIntervalMs)
    this.assertNotInFlight(
      rateKey,
      'Operation already in progress. Please wait for the previous request to finish.'
    )

    let idemStoreKey = null

    if (idempotencyKey) {
      idemStoreKey = this.buildIdempotencyKey(scope, userId, idempotencyKey)
      const cached = this.idempotencyResults.get(idemStoreKey)

      if (cached && cached.expiresAt > Date.now()) {
        return {
          replay: true,
          result: {
            ...cached.result,
            idempotent_replay: true
          }
        }
      }

      this.assertNotInFlight(
        idemStoreKey,
        'Duplicate idempotency key is already being processed.'
      )

      this.inFlight.set(idemStoreKey, Date.now())
    }

    const now = Date.now()
    this.inFlight.set(rateKey, now)
    this.lastRequestAt.set(rateKey, now)

    return {
      replay: false,
      context: {
        scope,
        rateKey,
        idemStoreKey
      }
    }
  }

  commit (context, result) {
    if (!context) {
      return result
    }

    if (context.idemStoreKey) {
      this.idempotencyResults.set(context.idemStoreKey, {
        result: {
          ...result,
          idempotent_replay: false
        },
        expiresAt: Date.now() + IDEMPOTENCY_TTL_MS
      })
    }

    this.release(context)

    return {
      ...result,
      idempotent_replay: false
    }
  }

  release (context) {
    if (!context) {
      return
    }

    if (context.rateKey) {
      this.inFlight.delete(context.rateKey)
    }

    if (context.idemStoreKey) {
      this.inFlight.delete(context.idemStoreKey)
    }
  }
}

module.exports = new OperationGuardService()
