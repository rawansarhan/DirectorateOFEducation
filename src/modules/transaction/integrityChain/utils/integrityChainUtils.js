'use strict'

const { createHash } = require('crypto')
const { verifyChallengeSignature } = require('../../../auth/services/cryptoAuthService')

const INTEGRITY_CHAIN_VERSION = '1.0'

const INTERNAL_DATA_KEYS = new Set([
  '_digital_signatures',
  '_digital_signatures_ledger',
  '_executedServiceTasks',
  '_generate_pdf_rejection',
  'schema_version',
  'submission',
  'files_meta'
])

/** حقول تتغير بعد التوقيع ولا يجب أن تكسر سلسلة النزاهة */
const STAGE_HASH_EXCLUDED_KEYS = new Set([
  ...INTERNAL_DATA_KEYS,
  'completed_by',
  'completed_at',
  'digital_signature',
  'rejection_reason'
])

function hashValue (value) {
  return createHash('sha256').update(String(value)).digest('hex')
}

function stableStringify (value) {
  if (value == null || typeof value !== 'object') {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map(item => stableStringify(item)).join(',')}]`
  }

  const keys = Object.keys(value).sort()

  return `{${keys
    .map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(',')}}`
}

function sanitizeStageDataForHash (stageData = {}) {
  if (!stageData || typeof stageData !== 'object' || Array.isArray(stageData)) {
    return {}
  }

  const sanitized = {}

  for (const [key, value] of Object.entries(stageData)) {
    if (STAGE_HASH_EXCLUDED_KEYS.has(key) || key.startsWith('_')) {
      continue
    }

    sanitized[key] = value
  }

  return sanitized
}

/**
 * يحل بيانات المرحلة للتحقق:
 * - عادةً تحت transaction.data[stage_code]
 * - مرحلة AUTH تُحفظ أحياناً في جذر data (form_id/widgets)
 */
function resolveStageDataForIntegrity (transactionData = {}, stageCode = null) {
  const nested = stageCode ? transactionData?.[stageCode] : null

  if (
    nested &&
    typeof nested === 'object' &&
    !Array.isArray(nested) &&
    (nested.form_id != null || Array.isArray(nested.widgets) || nested.stage_name != null)
  ) {
    return nested
  }

  if (
    transactionData &&
    typeof transactionData === 'object' &&
    (transactionData.form_id != null || Array.isArray(transactionData.widgets))
  ) {
    const rootSnapshot = {}
    for (const key of [
      'stage_name',
      'form_id',
      'form_name',
      'widgets',
      'templates',
      'decision',
      'note',
      'files',
      'fields'
    ]) {
      if (Object.prototype.hasOwnProperty.call(transactionData, key)) {
        rootSnapshot[key] = transactionData[key]
      }
    }
    return rootSnapshot
  }

  return nested && typeof nested === 'object' ? nested : {}
}

function buildGenesisHash ({ transactionId, processCode, createdAt }) {
  return hashValue(
    stableStringify({
      v: INTEGRITY_CHAIN_VERSION,
      transactionId,
      processCode,
      createdAt: new Date(createdAt).toISOString()
    })
  )
}

function computeStageDataHash (stageData = {}) {
  return hashValue(stableStringify(sanitizeStageDataForHash(stageData)))
}

function computeCumulativeHash ({
  genesisHash,
  previousCumulativeHash = null,
  stageDataHash
}) {
  return hashValue(
    [genesisHash, previousCumulativeHash || '', stageDataHash].join('|')
  )
}

function computeLinkHash ({
  cumulativeHash,
  signatureHash,
  signatureOrder
}) {
  return hashValue(
    [cumulativeHash, signatureHash, signatureOrder].join('|')
  )
}

function extractStageEntries (transactionData = {}) {
  const entries = []

  for (const [key, value] of Object.entries(transactionData || {})) {
    if (INTERNAL_DATA_KEYS.has(key)) {
      continue
    }

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      continue
    }

    entries.push({
      stage_code: key,
      data: value
    })
  }

  return entries
}

function buildQrPayload ({
  transactionId,
  genesisHash,
  headHash,
  totalLinks,
  apiBaseUrl
}) {
  const base = String(apiBaseUrl || '').replace(/\/$/, '')

  return {
    v: 1,
    tx: transactionId,
    genesis: genesisHash,
    head: headHash,
    links: totalLinks,
    verify: `${base}/api/transaction/${transactionId}/integrity-chain/verify`
  }
}

function verifySignatureValue ({
  publicKeyPem,
  message,
  signatureBase64
}) {
  return verifyChallengeSignature({
    publicKeyPem,
    message,
    signatureBase64
  })
}

module.exports = {
  INTEGRITY_CHAIN_VERSION,
  INTERNAL_DATA_KEYS,
  STAGE_HASH_EXCLUDED_KEYS,
  hashValue,
  stableStringify,
  sanitizeStageDataForHash,
  resolveStageDataForIntegrity,
  buildGenesisHash,
  computeStageDataHash,
  computeCumulativeHash,
  computeLinkHash,
  extractStageEntries,
  buildQrPayload,
  verifySignatureValue
}
