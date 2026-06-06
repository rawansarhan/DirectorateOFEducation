'use strict'

const {
  randomBytes,
  scryptSync,
  createCipheriv,
  createDecipheriv,
  createPrivateKey,
  sign
} = require('crypto')

const KEY_FILE = 'employee-key.enc'
const META_FILE = 'employee-key.meta.json'
const PUBLIC_FILE = 'employee-public.pem'

const SCRYPT_N = 16384
const SCRYPT_r = 8
const SCRYPT_p = 1
const KEY_LEN = 32

function deriveKey (passphrase, salt) {
  return scryptSync(String(passphrase), salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_r,
    p: SCRYPT_p,
    maxmem: 64 * 1024 * 1024
  })
}

function encryptPrivateKeyPem (privateKeyPem, passphrase, publicKeyFingerprint) {
  const salt = randomBytes(16)
  const iv = randomBytes(12)
  const key = deriveKey(passphrase, salt)
  const cipher = createCipheriv('aes-256-gcm', key, iv)

  const ciphertext = Buffer.concat([
    cipher.update(privateKeyPem, 'utf8'),
    cipher.final()
  ])

  const authTag = cipher.getAuthTag()
  key.fill(0)

  return {
    meta: {
      version: 1,
      algorithm: 'Ed25519',
      kdf: 'scrypt',
      kdf_params: {
        N: SCRYPT_N,
        r: SCRYPT_r,
        p: SCRYPT_p,
        keyLen: KEY_LEN
      },
      cipher: 'aes-256-gcm',
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      auth_tag: authTag.toString('base64'),
      public_key_fingerprint: publicKeyFingerprint
    },
    ciphertext: ciphertext.toString('base64')
  }
}

function decryptPrivateKeyPem ({ meta, ciphertextBase64 }, passphrase) {
  const salt = Buffer.from(meta.salt, 'base64')
  const iv = Buffer.from(meta.iv, 'base64')
  const authTag = Buffer.from(meta.auth_tag, 'base64')
  const key = deriveKey(passphrase, salt)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)

  decipher.setAuthTag(authTag)

  try {
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextBase64, 'base64')),
      decipher.final()
    ]).toString('utf8')
  } finally {
    key.fill(0)
  }
}

function signMessageWithPrivateKeyPem (message, privateKeyPem) {
  return sign(
    null,
    Buffer.from(message, 'utf8'),
    createPrivateKey(privateKeyPem)
  ).toString('base64')
}

function loadEncryptedKeyFromDir (usbDir) {
  const fs = require('fs')
  const path = require('path')

  const metaPath = path.join(usbDir, META_FILE)
  const encPath = path.join(usbDir, KEY_FILE)

  if (!fs.existsSync(metaPath) || !fs.existsSync(encPath)) {
    throw new Error(
      `Encrypted key not found in ${usbDir}. Expected ${META_FILE} and ${KEY_FILE}`
    )
  }

  return {
    meta: JSON.parse(fs.readFileSync(metaPath, 'utf8')),
    ciphertextBase64: fs.readFileSync(encPath, 'utf8').trim()
  }
}

module.exports = {
  KEY_FILE,
  META_FILE,
  PUBLIC_FILE,
  encryptPrivateKeyPem,
  decryptPrivateKeyPem,
  signMessageWithPrivateKeyPem,
  loadEncryptedKeyFromDir
}
