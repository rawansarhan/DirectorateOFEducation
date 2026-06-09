'use strict'

const {
  RETRY_MAX_ATTEMPTS,
  RETRY_BASE_DELAY_MS,
  RETRY_MAX_DELAY_MS
} = require('../config/env')

const LOG_PREFIX = '[Retry]'

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function computeBackoffDelay (attempt, baseDelayMs, maxDelayMs) {
  const exponential = baseDelayMs * (2 ** (attempt - 1))
  const jitter = Math.floor(Math.random() * baseDelayMs * 0.25)
  return Math.min(exponential + jitter, maxDelayMs)
}

function isRetryableError (error) {
  if (!error) {
    return false
  }

  const status = error.response?.status
  const code = error.code

  if (status && [408, 429, 500, 502, 503, 504].includes(status)) {
    return true
  }

  return [
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'EAI_AGAIN',
    'ENOTFOUND',
    'SequelizeConnectionError',
    'SequelizeConnectionAcquireTimeoutError'
  ].includes(code)
}

async function retryWithBackoff (
  fn,
  {
    label = 'operation',
    maxAttempts = RETRY_MAX_ATTEMPTS,
    baseDelayMs = RETRY_BASE_DELAY_MS,
    maxDelayMs = RETRY_MAX_DELAY_MS,
    shouldRetry = isRetryableError
  } = {}
) {
  let lastError

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fn(attempt)
    } catch (error) {
      lastError = error
      const canRetry = attempt < maxAttempts && shouldRetry(error)

      if (!canRetry) {
        throw error
      }

      const delayMs = computeBackoffDelay(attempt, baseDelayMs, maxDelayMs)

      console.warn(
        `${LOG_PREFIX} ${label} — attempt ${attempt}/${maxAttempts} failed: ${error.message} — retry in ${delayMs}ms`
      )

      await sleep(delayMs)
    }
  }

  throw lastError
}

module.exports = {
  retryWithBackoff,
  computeBackoffDelay,
  isRetryableError,
  sleep
}
