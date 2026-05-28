'use strict'

const fs = require('fs')
const path = require('path')

const {
  generateEd25519KeyPair,
  computeKeyFingerprint
} = require('../src/modules/auth/services/cryptoAuthService')

const outDir = path.join(__dirname, '..', 'test-keys')

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true })
}

const { publicKey, privateKey } = generateEd25519KeyPair()
const keyFingerprint = computeKeyFingerprint(publicKey)

const publicPath = path.join(outDir, 'employee-public.pem')
const privatePath = path.join(outDir, 'employee-private.pem')

fs.writeFileSync(publicPath, publicKey, 'utf8')
fs.writeFileSync(privatePath, privateKey, 'utf8')

console.log('')
console.log('=== Ed25519 keys generated for testing ===')
console.log('')
console.log('Public key file :', publicPath)
console.log('Private key file:', privatePath)
console.log('Key fingerprint :', keyFingerprint)
console.log('')
console.log('Use public_key in POST /api/auth/register/employee:')
console.log(JSON.stringify({ public_key: publicKey.trim() }, null, 2))
console.log('')
console.log('Keep employee-private.pem secret. Use it to sign challenges.')
console.log('Sign a message: npm run keys:sign -- "YOUR_CHALLENGE_MESSAGE"')
console.log('')
console.log('USB encrypted key flow:')
console.log('  1. npm run keys:encrypt -- "E:\\\\doe-keys" "YourStrongPassphrase"')
console.log('  2. npm run keys:sign-usb -- "E:\\\\doe-keys" "YourStrongPassphrase" "DOE-AUTH-CHALLENGE|v1|..."')
console.log('')
