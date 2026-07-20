'use strict'

/**
 * رمز تفاصيل التحقق — 6 أرقام عشوائية تُصدر عند كل مسح QR ناجح،
 * صالحة 5 دقائق فقط (Redis). تُستخدم في GET /api/verify/document/details.
 */

const crypto = require('crypto')

const {
  getCachedJson,
  setCachedJson,
  KEYS
} = require('../../../../core/cache/apiCacheService')

const DEFAULT_TTL_SECONDS = 5 * 60
const MAX_PIN_GENERATION_ATTEMPTS = 20
const API_CACHE_PREFIX = 'api:'

/** fallback في-memory عند غياب Redis (بيئة التطوير) */
const memoryCodes = new Map()

function generateSixDigitPin () {
  return String(crypto.randomInt(100000, 1000000))
}

function normalizeVerificationPin (code) {
  const trimmed = String(code ?? '').trim()

  if (!/^\d{6}$/.test(trimmed)) {
    throw new Error('رمز التحقق يجب أن يكون 6 أرقام')
  }

  return trimmed
}

function buildCacheKey (pin) {
  return `${API_CACHE_PREFIX}${KEYS.documentVerifyDetailsCode(pin)}`
}

function storeInMemory (pin, transactionId, ttlSeconds) {
  const expiresAt = Date.now() + ttlSeconds * 1000

  memoryCodes.set(pin, { transactionId, expiresAt })

  setTimeout(() => {
    memoryCodes.delete(pin)
  }, ttlSeconds * 1000)
}

function resolveFromMemory (pin) {
  const entry = memoryCodes.get(pin)

  if (!entry) {
    return null
  }

  if (Date.now() > entry.expiresAt) {
    memoryCodes.delete(pin)
    return null
  }

  return entry
}

async function issueDocumentDetailsCode (
  transactionId,
  { ttlSeconds = DEFAULT_TTL_SECONDS } = {}
) {
  const numericId = Number.parseInt(transactionId, 10)

  if (!Number.isInteger(numericId) || numericId < 1) {
    throw new Error('معرّف المعاملة غير صالح لإصدار رمز التحقق')
  }

  const expiresIn = Math.max(60, Number(ttlSeconds) || DEFAULT_TTL_SECONDS)

  for (let attempt = 0; attempt < MAX_PIN_GENERATION_ATTEMPTS; attempt += 1) {
    const pin = generateSixDigitPin()
    const cacheKey = buildCacheKey(pin)
    const existing = await getCachedJson(cacheKey)

    if (existing) {
      continue
    }

    const payload = { transactionId: numericId }
    const saved = await setCachedJson(cacheKey, payload, expiresIn)

    if (saved) {
      return {
        details_code: pin,
        expires_in_seconds: expiresIn
      }
    }

    storeInMemory(pin, numericId, expiresIn)

    return {
      details_code: pin,
      expires_in_seconds: expiresIn
    }
  }

  throw new Error('تعذّر إصدار رمز التحقق — حاول مجدداً')
}

async function resolveDocumentDetailsCode (code) {
  const pin = normalizeVerificationPin(code)
  const cacheKey = buildCacheKey(pin)
  const cached = await getCachedJson(cacheKey)

  if (cached?.transactionId) {
    return { transactionId: cached.transactionId }
  }

  const fromMemory = resolveFromMemory(pin)

  if (fromMemory) {
    return { transactionId: fromMemory.transactionId }
  }

  throw new Error('رمز التحقق غير صالح أو انتهت صلاحيته — أعد مسح رمز QR')
}

module.exports = {
  DEFAULT_TTL_SECONDS,
  issueDocumentDetailsCode,
  resolveDocumentDetailsCode
}
