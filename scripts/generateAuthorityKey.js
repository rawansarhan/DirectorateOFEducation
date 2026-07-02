'use strict'

/**
 * يولّد زوج مفاتيح "سلطة الإصدار" (Ed25519) المستخدم لتوقيع محتوى رمز QR في الـ PDF.
 *
 * التشغيل: npm run keys:authority
 *
 * انسخ القيمتين الناتجتين إلى ملف .env. ملاحظة: الأسطر تُحوَّل إلى \n حرفية
 * ليسهل وضعها في سطر واحد داخل .env (الخدمة تعيد تحويلها تلقائياً).
 *
 * احفظ المفتاح الخاص بسرية تامة (ENV/HSM) — هو أساس الثقة بكل رموز QR المُصدرة.
 */

const {
  generateEd25519KeyPair,
  computeKeyFingerprint
} = require('../src/modules/auth/services/cryptoAuthService')

const { publicKey, privateKey } = generateEd25519KeyPair()
const fingerprint = computeKeyFingerprint(publicKey)

function toEnvLine (pem) {
  return pem.trim().replace(/\r\n/g, '\n').replace(/\n/g, '\\n')
}

console.log('')
console.log('=== Integrity Authority Ed25519 key pair ===')
console.log('')
console.log('Key fingerprint:', fingerprint)
console.log('')
console.log('# أضف هذه الأسطر إلى .env')
console.log(`INTEGRITY_AUTHORITY_PRIVATE_KEY="${toEnvLine(privateKey)}"`)
console.log(`INTEGRITY_AUTHORITY_PUBLIC_KEY="${toEnvLine(publicKey)}"`)
console.log('')
console.log('احفظ المفتاح الخاص بسرية تامة ولا تشاركه إطلاقاً.')
console.log('')
