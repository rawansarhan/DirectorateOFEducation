/**
 * Browser-side Ed25519 helpers for employee registration and login.
 * Requires a modern browser with Web Crypto Ed25519 support.
 */

const STORAGE_PRIVATE_KEY = 'doe_employee_private_key_pem'
const STORAGE_PUBLIC_KEY = 'doe_employee_public_key_pem'
const STORAGE_KEY_FINGERPRINT = 'doe_employee_key_fingerprint'

function arrayBufferToBase64 (buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''

  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }

  return btoa(binary)
}

function base64ToArrayBuffer (base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }

  return bytes.buffer
}

function wrapPem (label, base64Body) {
  const lines = base64Body.match(/.{1,64}/g) || []

  return [
    `-----BEGIN ${label}-----`,
    ...lines,
    `-----END ${label}-----`
  ].join('\n')
}

function unwrapPem (pem, label) {
  const pattern = new RegExp(
    `-----BEGIN ${label}-----([\\s\\S]*?)-----END ${label}-----`
  )
  const match = String(pem).match(pattern)

  if (!match) {
    throw new Error(`Invalid ${label} PEM`)
  }

  return match[1].replace(/\s+/g, '')
}

async function sha256Hex (text) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text)
  )

  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function generateEmployeeKeyPairInBrowser () {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'Ed25519' },
    true,
    ['sign', 'verify']
  )

  const publicSpki = await crypto.subtle.exportKey('spki', keyPair.publicKey)
  const privatePkcs8 = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey)

  const publicKeyPem = wrapPem('PUBLIC KEY', arrayBufferToBase64(publicSpki))
  const privateKeyPem = wrapPem('PRIVATE KEY', arrayBufferToBase64(privatePkcs8))
  const keyFingerprint = await sha256Hex(publicKeyPem)

  return {
    keyPair,
    publicKeyPem,
    privateKeyPem,
    keyFingerprint
  }
}

async function importPrivateKeyFromPem (privateKeyPem) {
  const pkcs8 = base64ToArrayBuffer(unwrapPem(privateKeyPem, 'PRIVATE KEY'))

  return crypto.subtle.importKey(
    'pkcs8',
    pkcs8,
    { name: 'Ed25519' },
    false,
    ['sign']
  )
}

async function signChallengeMessageInBrowser (message, privateKeyPem) {
  const privateKey = await importPrivateKeyFromPem(privateKeyPem)
  const signature = await crypto.subtle.sign(
    { name: 'Ed25519' },
    privateKey,
    new TextEncoder().encode(message)
  )

  return arrayBufferToBase64(signature)
}

function saveEmployeeKeysLocally ({
  publicKeyPem,
  privateKeyPem,
  keyFingerprint
}) {
  localStorage.setItem(STORAGE_PUBLIC_KEY, publicKeyPem)
  localStorage.setItem(STORAGE_PRIVATE_KEY, privateKeyPem)
  localStorage.setItem(STORAGE_KEY_FINGERPRINT, keyFingerprint)
}

function loadEmployeeKeysLocally () {
  return {
    publicKeyPem: localStorage.getItem(STORAGE_PUBLIC_KEY),
    privateKeyPem: localStorage.getItem(STORAGE_PRIVATE_KEY),
    keyFingerprint: localStorage.getItem(STORAGE_KEY_FINGERPRINT)
  }
}

function downloadTextFile (filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  link.click()

  URL.revokeObjectURL(url)
}

window.DoeEmployeeCrypto = {
  generateEmployeeKeyPairInBrowser,
  signChallengeMessageInBrowser,
  saveEmployeeKeysLocally,
  loadEmployeeKeysLocally,
  downloadTextFile
}
