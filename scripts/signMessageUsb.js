'use strict'

const path = require('path')
const readline = require('readline')

const {
  decryptPrivateKeyPem,
  signMessageWithPrivateKeyPem,
  loadEncryptedKeyFromDir
} = require('./lib/usbKeyCrypto')

function parseArgs () {
  const args = process.argv.slice(2)

  if (args.length < 2) {
    return { usbDir: null, passphrase: null, message: null }
  }

  if (args.length === 2) {
    return {
      usbDir: args[0],
      passphrase: null,
      message: args[1]
    }
  }

  return {
    usbDir: args[0],
    passphrase: args[1],
    message: args.slice(2).join(' ')
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
  let { usbDir, passphrase, message } = parseArgs()

  if (!usbDir || !message) {
    console.error('Usage: npm run keys:sign-usb -- "E:\\doe-keys" "Passphrase" "DOE-AUTH-CHALLENGE|v1|..."')
    console.error('Or:    npm run keys:sign-usb -- "E:\\doe-keys" "DOE-AUTH-CHALLENGE|v1|..."')
    process.exit(1)
  }

  usbDir = path.resolve(usbDir)

  if (!passphrase) {
    passphrase = await askPassphrase('USB key passphrase: ')
  }

  const encrypted = loadEncryptedKeyFromDir(usbDir)

  let privateKeyPem

  try {
    privateKeyPem = decryptPrivateKeyPem(encrypted, passphrase)
  } catch (error) {
    console.error('Failed to decrypt USB key. Wrong passphrase or corrupted file.')
    process.exit(1)
  }

  const signature = signMessageWithPrivateKeyPem(message, privateKeyPem)

  console.log('')
  console.log('USB folder       :', usbDir)
  console.log('Key fingerprint  :', encrypted.meta.public_key_fingerprint)
  console.log('Message          :', message)
  console.log('Signature        :', signature)
  console.log('')
  console.log('POST /api/auth/employee/verify-signature')
  console.log(JSON.stringify({
    challenge_id: message.split('|')[2] || 'PASTE_FROM_CHALLENGE_RESPONSE',
    signature
  }, null, 2))
  console.log('')
}

main().catch(error => {
  console.error(error.message)
  process.exit(1)
})
