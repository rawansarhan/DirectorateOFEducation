'use strict'

const {
  OPERATION_MIN_INTERVAL_MS,
  IDEMPOTENCY_TTL_MS: IDEMPOTENCY_TTL_MS_ENV,
  OPERATION_GUARD_CLEANUP_MS
} = require('../config/env')

const MIN_INTERVAL_MS = OPERATION_MIN_INTERVAL_MS
const IDEMPOTENCY_TTL_MS = IDEMPOTENCY_TTL_MS_ENV
const CLEANUP_INTERVAL_MS = OPERATION_GUARD_CLEANUP_MS

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

  buildRateLimitKey (scope, userId, resourceId) {
    return `${scope}:rate:${userId}:${resourceId}`
  }

  buildIdempotencyKey (scope, userId, idempotencyKey) {
    return `${scope}:idem:${userId}:${idempotencyKey}`
  }

  buildInFlightKey (scope, userId, idempotencyKey) {
    return `${scope}:inflight:${userId}:${idempotencyKey}`
  }

  /**
   * Read cached idempotency result only — does not register in-flight.
   * @returns {*|null}
   */
  getReplay ({ scope, userId, idempotencyKey }) {
    if (!userId || !idempotencyKey) {
      return null
    }

    const idemStoreKey = this.buildIdempotencyKey(scope, userId, idempotencyKey)
    const cached = this.idempotencyResults.get(idemStoreKey)

    if (cached && cached.expiresAt > Date.now()) {
      return {
        ...cached.result,
        data: {
          ...(cached.result.data || {}),
          idempotent_replay: true
        }
      }
    }

    return null
  }

  /**
   * @returns {{ replay: boolean, result?: *, context?: object }}
   */
  begin ({ scope, userId, resourceId, idempotencyKey }) {
    if (!userId || !idempotencyKey) {
      return { replay: false, context: null }
    }

    const idemStoreKey = this.buildIdempotencyKey(scope, userId, idempotencyKey)
    const cached = this.idempotencyResults.get(idemStoreKey)

    if (cached && cached.expiresAt > Date.now()) {
      return {
        replay: true,
        result: {
          ...cached.result,
          data: {
            ...(cached.result.data || {}),
            idempotent_replay: true
          }
        }
      }
    }

    const rateKey = this.buildRateLimitKey(scope, userId, resourceId || idempotencyKey)
    const lastAt = this.lastRequestAt.get(rateKey) || 0
    const now = Date.now()

    if (now - lastAt < MIN_INTERVAL_MS) {
      const error = new Error('تم تجاوز حد الطلبات — انتظر قليلاً ثم أعد المحاولة')
      error.code = 'RATE_LIMITED'
      throw error
    }

    const inFlightKey = this.buildInFlightKey(scope, userId, idempotencyKey)

    if (this.inFlight.has(inFlightKey)) {
      const error = new Error('Duplicate request is already in progress')
      error.code = 'DUPLICATE_IN_FLIGHT'
      throw error
    }

    this.lastRequestAt.set(rateKey, now)
    this.inFlight.set(inFlightKey, now)

    return {
      replay: false,
      context: {
        scope,
        userId,
        resourceId,
        idempotencyKey,
        idemStoreKey,
        inFlightKey
      }
    }
  }

  commit (context, result) {
    if (!context) {
      return {
        ...result,
        data: {
          ...(result.data || {}),
          idempotent_replay: false
        }
      }
    }

    this.inFlight.delete(context.inFlightKey)

    const committed = {
      ...result,
      data: {
        ...(result.data || {}),
        idempotent_replay: false
      }
    }

    this.idempotencyResults.set(context.idemStoreKey, {
      result: committed,
      expiresAt: Date.now() + IDEMPOTENCY_TTL_MS
    })

    return committed
  }

  release (context) {
    if (!context?.inFlightKey) {
      return
    }

    this.inFlight.delete(context.inFlightKey)
  }
}

module.exports = new OperationGuardService()
