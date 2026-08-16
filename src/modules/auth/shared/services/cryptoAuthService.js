'use strict'

const {
  generateKeyPairSync,
  createHash,
  randomBytes,
  verify,
  createPublicKey,
  createPrivateKey
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

const ED25519_SPKI_DER_LENGTH = 44
const ED25519_SIGNATURE_LENGTH = 64

function computeKeyFingerprint (publicKeyPem) {
  return createHash('sha256').update(publicKeyPem).digest('hex')
}

function normalizePublicKeyPem (publicKeyInput) {
  const value = String(publicKeyInput || '').trim()

  if (!value) {
    throw new Error('public_key is required')
  }

  if (value.includes('BEGIN PUBLIC KEY')) {
    return value.replace(/\r\n/g, '\n')
  }

  const base64Body = value.replace(/\s+/g, '')

  return [
    '-----BEGIN PUBLIC KEY-----',
    base64Body.match(/.{1,64}/g).join('\n'),
    '-----END PUBLIC KEY-----'
  ].join('\n')
}

function assertEd25519SpkiPublicKey (publicKey) {
  if (publicKey.asymmetricKeyType !== 'ed25519') {
    throw new Error('public_key must be an Ed25519 key')
  }

  const der = publicKey.export({ type: 'spki', format: 'der' })

  if (der.length !== ED25519_SPKI_DER_LENGTH) {
    throw new Error('public_key must be a valid Ed25519 SPKI key')
  }
}

function canonicalizePublicKeyPem (publicKeyInput) {
  const publicKeyPem = normalizePublicKeyPem(publicKeyInput)
  const publicKey = createPublicKey(publicKeyPem)

  assertEd25519SpkiPublicKey(publicKey)

  return publicKey.export({ type: 'spki', format: 'pem' })
}

function validatePublicKeyPem (publicKeyInput) {
  try {
    return canonicalizePublicKeyPem(publicKeyInput)
  } catch (error) {
    throw new Error('public_key is invalid or unsupported')
  }
}

function normalizePrivateKeyPem (privateKeyInput) {
  const value = String(privateKeyInput || '').trim()

  if (!value) {
    throw new Error('private_key is required')
  }

  if (value.includes('BEGIN PRIVATE KEY')) {
    return value.replace(/\r\n/g, '\n')
  }

  const base64Body = value.replace(/\s+/g, '')

  return [
    '-----BEGIN PRIVATE KEY-----',
    base64Body.match(/.{1,64}/g).join('\n'),
    '-----END PRIVATE KEY-----'
  ].join('\n')
}

function validatePrivateKeyPem (privateKeyInput) {
  try {
    const privateKeyPem = normalizePrivateKeyPem(privateKeyInput)
    const privateKey = createPrivateKey(privateKeyPem)

    if (privateKey.asymmetricKeyType !== 'ed25519') {
      throw new Error('private_key must be an Ed25519 key')
    }

    return privateKeyPem
  } catch (error) {
    throw new Error('private_key is invalid or unsupported')
  }
}

function derivePublicKeyPemFromPrivate (privateKeyInput) {
  const privateKeyPem = validatePrivateKeyPem(privateKeyInput)
  const publicKey = createPublicKey(createPrivateKey(privateKeyPem))

  return publicKey.export({ type: 'spki', format: 'pem' })
}

function assertPrivatePublicKeyPair (privateKeyInput, publicKeyInput) {
  const privateKeyPem = validatePrivateKeyPem(privateKeyInput)
  const publicKeyPem = validatePublicKeyPem(publicKeyInput)
  const derivedPublicKeyPem = derivePublicKeyPemFromPrivate(privateKeyPem)

  if (derivedPublicKeyPem !== publicKeyPem) {
    throw new Error('private_key does not match public_key')
  }

  return {
    privateKeyPem,
    publicKeyPem
  }
}

function parseChallengeMessage (message) {
  const parts = String(message || '').split('|')

  // DOE-AUTH-CHALLENGE|v1|challengeId|nonce|expiresAt|userId|keyFingerprint
  if (
    parts.length !== 7 ||
    parts[0] !== 'DOE-AUTH-CHALLENGE' ||
    parts[1] !== 'v1'
  ) {
    throw new Error('Challenge message is invalid')
  }

  return {
    challengeId: parts[2],
    nonce: parts[3],
    expiresAt: parts[4],
    userId: parts[5],
    keyFingerprint: parts[6]
  }
}

function extractChallengeFingerprint (message) {
  return parseChallengeMessage(message).keyFingerprint
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
  try {
    const publicKey = createPublicKey(canonicalizePublicKeyPem(publicKeyPem))
    const signature = Buffer.from(String(signatureBase64 || ''), 'base64')

    if (signature.length !== ED25519_SIGNATURE_LENGTH) {
      return false
    }

    return verify(
      null,
      Buffer.from(message, 'utf8'),
      publicKey,
      signature
    )
  } catch (error) {
    return false
  }
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

function parseTransactionSignMessage (message) {
  const parts = String(message || '').split('|')

  if (parts.length < 10 || `${parts[0]}|${parts[1]}` !== TX_SIGN_PREFIX) {
    return null
  }

  return {
    prefix: TX_SIGN_PREFIX,
    signingId: parts[2],
    taskId: parts[3],
    transactionId: parts[4],
    stageCode: parts[5],
    payloadHash: parts[6],
    expiresAt: parts[7],
    userId: parts[8],
    keyFingerprint: parts.slice(9).join('|')
  }
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
  validatePrivateKeyPem,
  derivePublicKeyPemFromPrivate,
  assertPrivatePublicKeyPair,
  canonicalizePublicKeyPem,
  parseChallengeMessage,
  extractChallengeFingerprint,
  computeKeyFingerprint,
  hashValue,
  hashPin,
  verifyPin,
  generateNonce,
  buildChallengeMessage,
  buildTransactionSignMessage,
  parseTransactionSignMessage,
  buildCanonicalPayloadHash,
  verifyChallengeSignature,
  getChallengeExpiresAt,
  getPinSessionExpiresAt,
  getTransactionSignExpiresAt
}
