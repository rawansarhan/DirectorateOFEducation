'use strict'

/**
 * =============================================================================
 * authoritySignatureService — توقيع/تحقق سلطة الإصدار (Ed25519)
 * =============================================================================
 *
 * الخادم يملك زوج مفاتيح "سلطة" واحد (Authority Key) مستقل عن مفاتيح الموظفين.
 * يُستخدم لتوقيع "ربط الوثيقة" (Document Binding) المضمّن في رمز QR داخل الـ PDF،
 * بحيث يُثبت أن هذا الـ QR صدر فعلاً عن الخادم لهذه المعاملة/الوثيقة تحديداً،
 * ولا يمكن لمهاجم تزوير QR يشير لسلسلة نزاهة مختلفة.
 *
 * رسالة الربط (canonical):
 *   DOE-DOC-QR|v1|<transactionId>|<genesisHash>|<documentInstanceId>
 *
 * المفتاح الخاص لا يُخزّن في قاعدة البيانات — فقط في ENV/HSM. التحقق العام يعتمد
 * على المفتاح العام فقط.
 */

const { createPrivateKey, createPublicKey, sign, verify } = require('crypto')
const {
  INTEGRITY_AUTHORITY_PRIVATE_KEY,
  INTEGRITY_AUTHORITY_PUBLIC_KEY
} = require('../../../../core/config/env')

const DOC_QR_PREFIX = 'DOE-DOC-QR'
const DOC_QR_VERSION = 'v1'
const ED25519_SIGNATURE_LENGTH = 64

/** يحوّل قيمة ENV (قد تحتوي \n حرفية) إلى PEM صالح بأسطر فعلية */
function normalizePemFromEnv (rawValue) {
  return String(rawValue || '')
    .trim()
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
}

let cachedPrivateKey = null
let cachedPublicKeyPem = null

function loadAuthorityPrivateKey () {
  if (cachedPrivateKey) {
    return cachedPrivateKey
  }

  const pem = normalizePemFromEnv(INTEGRITY_AUTHORITY_PRIVATE_KEY)

  if (!pem) {
    throw new Error(
      'INTEGRITY_AUTHORITY_PRIVATE_KEY غير مُعرّف — ولّد زوج المفاتيح عبر: npm run keys:authority'
    )
  }

  const privateKey = createPrivateKey(pem)

  if (privateKey.asymmetricKeyType !== 'ed25519') {
    throw new Error('INTEGRITY_AUTHORITY_PRIVATE_KEY يجب أن يكون مفتاح Ed25519')
  }

  cachedPrivateKey = privateKey

  return cachedPrivateKey
}

/**
 * يعيد المفتاح العام بصيغة PEM.
 * يُفضّل INTEGRITY_AUTHORITY_PUBLIC_KEY إن وُجد، وإلا يُشتق من المفتاح الخاص.
 */
function getAuthorityPublicKeyPem () {
  if (cachedPublicKeyPem) {
    return cachedPublicKeyPem
  }

  const configuredPublic = normalizePemFromEnv(INTEGRITY_AUTHORITY_PUBLIC_KEY)

  if (configuredPublic) {
    const publicKey = createPublicKey(configuredPublic)

    if (publicKey.asymmetricKeyType !== 'ed25519') {
      throw new Error('INTEGRITY_AUTHORITY_PUBLIC_KEY يجب أن يكون مفتاح Ed25519')
    }

    cachedPublicKeyPem = publicKey.export({ type: 'spki', format: 'pem' })

    return cachedPublicKeyPem
  }

  const publicKey = createPublicKey(loadAuthorityPrivateKey())

  cachedPublicKeyPem = publicKey.export({ type: 'spki', format: 'pem' })

  return cachedPublicKeyPem
}
//التحقق من صلاحية المفتاح الخاص للسلطة 
function isAuthorityKeyConfigured () {
  return Boolean(normalizePemFromEnv(INTEGRITY_AUTHORITY_PRIVATE_KEY))
}
//بناء رسالة الربط
function buildDocumentBindingMessage ({
  transactionId,
  genesisHash,
  documentInstanceId
}) {
  return [
    DOC_QR_PREFIX,
    DOC_QR_VERSION,
    transactionId,
    genesisHash,
    documentInstanceId
  ].join('|')
}

/** يوقّع رسالة ربط الوثيقة ويعيد التوقيع base64url */
function signDocumentBinding ({
  transactionId,
  genesisHash,
  documentInstanceId
}) {
  //بناء رسالة الربط
  const message = buildDocumentBindingMessage({
    transactionId,
    genesisHash,
    documentInstanceId
  })
//توقيع رسالة الربط
  const signature = sign(null, Buffer.from(message, 'utf8'), loadAuthorityPrivateKey())
//عرض التوقيع بصيغة base64url
  return signature.toString('base64url')
}

/** يتحقق من توقيع ربط الوثيقة باستخدام المفتاح العام للسلطة */
//genesisHash => هو الرقم المميز للمعاملة ويتم حسابه بواسطة buildGenesisHash
function verifyDocumentBinding ({
  transactionId,
  genesisHash,
  documentInstanceId,
  signatureBase64Url
}) {
  try {
    //تحويل التوقيع من صيغة base64url الىى buffer
    const signature = Buffer.from(String(signatureBase64Url || ''), 'base64url')
//التحقق من طول التوقيع 
    if (signature.length !== ED25519_SIGNATURE_LENGTH) {
      return false
    }
//بناء رسالة الربط
    const message = buildDocumentBindingMessage({
      transactionId,
      genesisHash,
      documentInstanceId
    })
//التحقق من التوقيع
    return verify(
      null,
      Buffer.from(message, 'utf8'),
      createPublicKey(getAuthorityPublicKeyPem()),
      signature
    )
  } catch (_) {
    return false
  }
}

module.exports = {
  DOC_QR_PREFIX,
  DOC_QR_VERSION,
  isAuthorityKeyConfigured,
  getAuthorityPublicKeyPem,
  buildDocumentBindingMessage,
  signDocumentBinding,
  verifyDocumentBinding
}
