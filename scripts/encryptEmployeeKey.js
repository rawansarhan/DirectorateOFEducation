'use strict'

const fs = require('fs')
const path = require('path')
const readline = require('readline')

const { computeKeyFingerprint } = require('../src/modules/auth/services/cryptoAuthService')
const {
  KEY_FILE,
  META_FILE,
  PUBLIC_FILE,
  encryptPrivateKeyPem
} = require('./lib/usbKeyCrypto')

const localDir = path.join(__dirname, '..', 'test-keys')
const privatePath = path.join(localDir, 'employee-private.pem')
const publicPath = path.join(localDir, 'employee-public.pem')

function parseArgs () {
  const args = process.argv.slice(2)
  const deletePlaintext = args.includes('--delete-plaintext')
  const filtered = args.filter(arg => arg !== '--delete-plaintext')

  return {
    usbDir: filtered[0],
    passphrase: filtered[1],
    deletePlaintext
  }
}

function askPassphrase (prompt) {
  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    rl.question(prompt, answer => {
      rl.close()
      resolve(answer)
    })
  })
}

async function main () {
  let { usbDir, passphrase, deletePlaintext } = parseArgs()

  if (!fs.existsSync(privatePath)) {
    console.error('Private key not found. Run: npm run keys:generate')
    process.exit(1)
  }

  if (!fs.existsSync(publicPath)) {
    console.error('Public key not found. Run: npm run keys:generate')
    process.exit(1)
  }

  if (!usbDir) {
    console.error('Usage: npm run keys:encrypt -- "E:\\doe-keys" "YourStrongPassphrase"')
    console.error('Optional: add --delete-plaintext to remove local employee-private.pem')
    process.exit(1)
  }

  usbDir = path.resolve(usbDir)

  if (!passphrase) {
    passphrase = await askPassphrase('USB key passphrase: ')
  }

  if (!passphrase || passphrase.length < 8) {
    console.error('Passphrase must be at least 8 characters.')
    process.exit(1)
  }

  const privateKeyPem = fs.readFileSync(privatePath, 'utf8')
  const publicKeyPem = fs.readFileSync(publicPath, 'utf8')
  const keyFingerprint = computeKeyFingerprint(publicKeyPem)
  const encrypted = encryptPrivateKeyPem(privateKeyPem, passphrase, keyFingerprint)

  fs.mkdirSync(usbDir, { recursive: true })

  fs.writeFileSync(
    path.join(usbDir, META_FILE),
    JSON.stringify(encrypted.meta, null, 2),
    'utf8'
  )
  fs.writeFileSync(path.join(usbDir, KEY_FILE), encrypted.ciphertext, 'utf8')
  fs.writeFileSync(path.join(usbDir, PUBLIC_FILE), publicKeyPem, 'utf8')

  console.log('')
  console.log('=== Encrypted employee key saved to USB folder ===')
  console.log('')
  console.log('Folder          :', usbDir)
  console.log('Encrypted file  :', path.join(usbDir, KEY_FILE))
  console.log('Metadata file   :', path.join(usbDir, META_FILE))
  console.log('Public key copy :', path.join(usbDir, PUBLIC_FILE))
  console.log('Key fingerprint :', keyFingerprint)
  console.log('')
  console.log('Local plaintext private key was NOT copied to USB.')
  console.log('Sign from USB:')
  console.log('  npm run keys:sign-usb -- "' + usbDir + '" "YourPassphrase" "DOE-AUTH-CHALLENGE|v1|..."')
  console.log('')

  if (deletePlaintext) {
    fs.unlinkSync(privatePath)
    console.log('Deleted local plaintext:', privatePath)
    console.log('')
  } else {
    console.log('Tip: use --delete-plaintext after verifying USB signing works.')
    console.log('')
  }
}

main().catch(error => {
  console.error(error.message)
  process.exit(1)
})
