'use strict'

/**
 * فك/تشفير حمولة JSON بـ AES-256-GCM لمسارات مثل submit المشفر.
 * المفتاح: SUBMIT_AES_KEY_BASE64 (32 بايت بصيغة base64) من .env
 */

const { createCipheriv, createDecipheriv, randomBytes } = require('crypto')

// يحمّل dotenv عبر env.js مرة واحدة عند أول استيراد
const { SUBMIT_AES_KEY_BASE64 } = require('../config/env')

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const KEY_LENGTH = 32

function getSubmitAesKey () {
  const raw = SUBMIT_AES_KEY_BASE64

  if (!raw || !String(raw).trim()) {
    const error = new Error(
      'SUBMIT_AES_KEY_BASE64 غير مضبوط في .env — مطلوب لفك تشفير طلب التقديم'
    )
    error.code = 'SUBMIT_AES_KEY_MISSING'
    throw error
  }

  let key

  try {
    key = Buffer.from(String(raw).trim(), 'base64')
  } catch {
    const error = new Error('SUBMIT_AES_KEY_BASE64 غير صالح (يجب أن يكون base64)')
    error.code = 'SUBMIT_AES_KEY_INVALID'
    throw error
  }

  if (key.length !== KEY_LENGTH) {
    const error = new Error(
      `SUBMIT_AES_KEY_BASE64 يجب أن يفكّ إلى ${KEY_LENGTH} بايت (AES-256) — الحالي: ${key.length}`
    )
    error.code = 'SUBMIT_AES_KEY_INVALID'
    throw error
  }

  return key
}

/**
 * يفك تشفير حمولة { iv, ciphertext, tag } ويعيد نص UTF-8.
 */
function decryptAes256GcmPayload ({ iv, ciphertext, tag } = {}) {
  if (!iv || !ciphertext || !tag) {
    const error = new Error(
      'بيانات التشفير ناقصة — مطلوب: iv, ciphertext, tag (base64)'
    )
    error.code = 'ENCRYPTED_PAYLOAD_INVALID'
    throw error
  }

  const key = getSubmitAesKey()

  let ivBuf
  let tagBuf
  let cipherBuf

  try {
    ivBuf = Buffer.from(String(iv).trim(), 'base64')
    tagBuf = Buffer.from(String(tag).trim(), 'base64')
    cipherBuf = Buffer.from(String(ciphertext).trim(), 'base64')
  } catch {
    const error = new Error('iv / ciphertext / tag يجب أن تكون بصيغة base64 صالحة')
    error.code = 'ENCRYPTED_PAYLOAD_INVALID'
    throw error
  }

  if (ivBuf.length !== IV_LENGTH) {
    const error = new Error(
      `طول iv غير صالح لـ AES-GCM — المتوقع ${IV_LENGTH} بايت`
    )
    error.code = 'ENCRYPTED_PAYLOAD_INVALID'
    throw error
  }

  try {
    const decipher = createDecipheriv(ALGORITHM, key, ivBuf)
    decipher.setAuthTag(tagBuf)

    const plain = Buffer.concat([
      decipher.update(cipherBuf),
      decipher.final()
    ]).toString('utf8')

    key.fill(0)
    return plain
  } catch (err) {
    key.fill(0)

    if (err.code === 'SUBMIT_AES_KEY_MISSING' || err.code === 'SUBMIT_AES_KEY_INVALID') {
      throw err
    }

    const error = new Error(
      'فشل فك تشفير الطلب — تحقق من المفتاح أو سلامة iv/ciphertext/tag'
    )
    error.code = 'DECRYPTION_FAILED'
    throw error
  }
}

/**
 * يفك التشفير ثم يحوّل الناتج إلى كائن JSON (جسم التقديم العادي).
 */
function decryptAes256GcmJsonPayload (encryptedBody = {}) {
  const plain = decryptAes256GcmPayload(encryptedBody)

  try {
    const parsed = JSON.parse(plain)

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      const error = new Error(
        'محتوى الطلب بعد فك التشفير يجب أن يكون كائن JSON'
      )
      error.code = 'DECRYPTED_JSON_INVALID'
      throw error
    }

    return parsed
  } catch (err) {
    if (err.code === 'DECRYPTED_JSON_INVALID') {
      throw err
    }

    const error = new Error(
      'محتوى الطلب بعد فك التشفير ليس JSON صالحاً'
    )
    error.code = 'DECRYPTED_JSON_INVALID'
    throw error
  }
}

/**
 * للفرونت/الاختبارات: يشفر نص UTF-8 ويعيد { iv, ciphertext, tag }.
 */
function encryptAes256GcmPayload (plaintextUtf8) {
  const key = getSubmitAesKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const ciphertext = Buffer.concat([
    cipher.update(String(plaintextUtf8), 'utf8'),
    cipher.final()
  ])

  const tag = cipher.getAuthTag()
  key.fill(0)

  return {
    iv: iv.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
    tag: tag.toString('base64')
  }
}

module.exports = {
  ALGORITHM,
  IV_LENGTH,
  KEY_LENGTH,
  decryptAes256GcmPayload,
  decryptAes256GcmJsonPayload,
  encryptAes256GcmPayload
}
