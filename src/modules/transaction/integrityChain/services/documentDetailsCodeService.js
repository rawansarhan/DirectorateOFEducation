'use strict'

/**
 * رمز تفاصيل التحقق من QR — يُصدر بعد نجاح المسح العام،
 * ويُستخدم في GET /api/verify/document/details لجلب التفاصيل.
 */

const crypto = require('crypto')
const jwt = require('jsonwebtoken')

const PURPOSE = 'qr_document_details'
const DEFAULT_TTL_SECONDS = 15 * 60

const ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ||
  process.env.JWT_SECRET ||
  'your_very_secret_key'

function issueDocumentDetailsCode (transactionId, { ttlSeconds = DEFAULT_TTL_SECONDS } = {}) {
  const numericId = Number.parseInt(transactionId, 10)

  if (!Number.isInteger(numericId) || numericId < 1) {
    throw new Error('معرّف المعاملة غير صالح لإصدار رمز التفاصيل')
  }

  const expiresIn = Math.max(60, Number(ttlSeconds) || DEFAULT_TTL_SECONDS)
  const jti = crypto.randomBytes(8).toString('hex')

  const code = jwt.sign(
    {
      purpose: PURPOSE,
      tx: numericId,
      jti
    },
    ACCESS_SECRET,
    { expiresIn }
  )

  return {
    details_code: code,
    expires_in_seconds: expiresIn
  }
}

function resolveDocumentDetailsCode (code) {
  if (!code || typeof code !== 'string' || !code.trim()) {
    throw new Error('رمز التفاصيل مطلوب')
  }

  let decoded

  try {
    decoded = jwt.verify(code.trim(), ACCESS_SECRET)
  } catch (error) {
    if (error?.name === 'TokenExpiredError') {
      throw new Error('انتهت صلاحية رمز التفاصيل — أعد مسح رمز QR')
    }

    throw new Error('رمز التفاصيل غير صالح')
  }

  if (decoded?.purpose !== PURPOSE) {
    throw new Error('رمز التفاصيل غير صالح')
  }

  const transactionId = Number.parseInt(decoded.tx, 10)

  if (!Number.isInteger(transactionId) || transactionId < 1) {
    throw new Error('رمز التفاصيل غير صالح')
  }

  return { transactionId }
}

module.exports = {
  PURPOSE,
  DEFAULT_TTL_SECONDS,
  issueDocumentDetailsCode,
  resolveDocumentDetailsCode
}
