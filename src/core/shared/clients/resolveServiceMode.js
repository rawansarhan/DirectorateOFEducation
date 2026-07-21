'use strict'

/**
 * Same-process vs remote service gate.
 *
 * Rule:
 * - Unset / empty *_SERVICE_URL  → use module public facade (in-process)
 * - Explicit *_SERVICE_URL       → HTTP client for future service split
 */

function resolveRemoteBaseUrl (envKey) {
  const value = process.env[envKey]

  if (value == null || String(value).trim() === '') {
    return null
  }

  return String(value).trim().replace(/\/$/, '')
}

function shouldUseRemoteHttp (envKey) {
  return resolveRemoteBaseUrl(envKey) != null
}

module.exports = {
  resolveRemoteBaseUrl,
  shouldUseRemoteHttp
}
