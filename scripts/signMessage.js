'use strict'

const fs = require('fs')
const path = require('path')
const { createPrivateKey, sign } = require('crypto')

const privatePath = path.join(__dirname, '..', 'test-keys', 'employee-private.pem')
const message = process.argv.slice(2).join(' ')

if (!message) {
  console.error('Usage: npm run keys:sign -- "DOE-AUTH-CHALLENGE|v1|..."')
  process.exit(1)
}

if (!fs.existsSync(privatePath)) {
  console.error('Private key not found. Run: npm run keys:generate')
  process.exit(1)
}

const privateKeyPem = fs.readFileSync(privatePath, 'utf8')
const signature = sign(
  null,
  Buffer.from(message, 'utf8'),
  createPrivateKey(privateKeyPem)
).toString('base64')

console.log('')
console.log('Message  :', message)
console.log('Signature:', signature)
console.log('')
