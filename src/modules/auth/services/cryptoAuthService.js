'use strict'

const {
  generateKeyPairSync,
  createHash,
  randomBytes,
  verify,
  createPublicKey
} = require('crypto')
const bcrypt = require('bcryptjs')

const TX_SIGN_PREFIX = 'DOE-TX-SIGN|v1'
const CHALLENGE_PREFIX = 'DOE-AUTH-CHALLENGE|v1'
const CHALLENGE_TTL_MS = 5 * 60 * 1000
const PIN_SESSION_TTL_MS = 5 * 60 * 1000
const TX_SIGN_TTL_MS = 5 * 60 * 1000

function generateEd25519KeyPair () {
  return generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  })
}

function computeKeyFingerprint (publicKeyPem) {
  return createHash('sha256').update(publicKeyPem).digest('hex')
}

function normalizePublicKeyPem (publicKeyInput) {
  const value = String(publicKeyInput || '').trim()

  if (!value) {
    throw new Error('public_key is required')
  }

  if (value.includes('BEGIN PUBLIC KEY')) {
    return value
  }

  const base64Body = value.replace(/\s+/g, '')

  return [
    '-----BEGIN PUBLIC KEY-----',
    base64Body.match(/.{1,64}/g).join('\n'),
    '-----END PUBLIC KEY-----'
  ].join('\n')
}

function validatePublicKeyPem (publicKeyInput) {
  const publicKeyPem = normalizePublicKeyPem(publicKeyInput)

  try {
    const publicKey = createPublicKey(publicKeyPem)

    if (publicKey.asymmetricKeyType !== 'ed25519') {
      throw new Error('public_key must be an Ed25519 key')
    }

    return publicKeyPem
  } catch (error) {
    throw new Error('public_key is invalid or unsupported')
  }
}

function hashValue (value) {
  return createHash('sha256').update(String(value)).digest('hex')
}

async function hashPin (pin) {
  return bcrypt.hash(String(pin), 10)
}

async function verifyPin (pin, pinHash) {
  if (!pinHash) {
    return false
  }

  return bcrypt.compare(String(pin), pinHash)
}

function generateNonce () {
  return randomBytes(32).toString('base64url')
}

function buildChallengeMessage ({
  challengeId,
  nonce,
  expiresAt,
  userId,
  keyFingerprint
}) {
  return [
    CHALLENGE_PREFIX,
    challengeId,
    nonce,
    new Date(expiresAt).toISOString(),
    userId,
    keyFingerprint
  ].join('|')
}

function verifyChallengeSignature ({
  publicKeyPem,
  message,
  signatureBase64
}) {
  const publicKey = createPublicKey(publicKeyPem)

  return verify(
    null,
    Buffer.from(message, 'utf8'),
    publicKey,
    Buffer.from(signatureBase64, 'base64')
  )
}

function getChallengeExpiresAt () {
  return new Date(Date.now() + CHALLENGE_TTL_MS)
}

function buildTransactionSignMessage ({
  signingId,
  taskId,
  transactionId,
  stageCode,
  payloadHash,
  expiresAt,
  userId,
  keyFingerprint
}) {
  return [
    TX_SIGN_PREFIX,
    signingId,
    taskId,
    transactionId,
    stageCode,
    payloadHash,
    new Date(expiresAt).toISOString(),
    userId,
    keyFingerprint
  ].join('|')
}

function getTransactionSignExpiresAt () {
  return new Date(Date.now() + TX_SIGN_TTL_MS)
}

function buildCanonicalPayloadHash (payload) {
  return hashValue(JSON.stringify(payload))
}

function getPinSessionExpiresAt () {
  return new Date(Date.now() + PIN_SESSION_TTL_MS)
}

module.exports = {
  CHALLENGE_TTL_MS,
  PIN_SESSION_TTL_MS,
  TX_SIGN_TTL_MS,
  generateEd25519KeyPair,
  normalizePublicKeyPem,
  validatePublicKeyPem,
  computeKeyFingerprint,
  hashValue,
  hashPin,
  verifyPin,
  generateNonce,
  buildChallengeMessage,
  buildTransactionSignMessage,
  buildCanonicalPayloadHash,
  verifyChallengeSignature,
  getChallengeExpiresAt,
  getPinSessionExpiresAt,
  getTransactionSignExpiresAt
}
