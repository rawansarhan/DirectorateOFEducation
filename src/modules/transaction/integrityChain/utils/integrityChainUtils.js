'use strict'

const { createHash } = require('crypto')
const { verifyChallengeSignature } = require('../../../auth/services/cryptoAuthService')

const INTEGRITY_CHAIN_VERSION = '1.0'

const INTERNAL_DATA_KEYS = new Set([
  '_digital_signatures',
  '_digital_signatures_ledger',
  '_executedServiceTasks',
  'schema_version',
  'submission',
  'files_meta'
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
  return hashValue(stableStringify(stageData))
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
  hashValue,
  stableStringify,
  buildGenesisHash,
  computeStageDataHash,
  computeCumulativeHash,
  computeLinkHash,
  extractStageEntries,
  buildQrPayload,
  verifySignatureValue
}
