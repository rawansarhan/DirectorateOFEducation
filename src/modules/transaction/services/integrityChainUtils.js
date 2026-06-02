'use strict'

const { createHash } = require('crypto')
const { verify, createPublicKey } = require('crypto')
const { API_PUBLIC_URL } = require('../../../core/config/env')

const INTEGRITY_CHAIN_VERSION = '1.0'
const INTERNAL_DATA_KEYS = new Set([
  '_digital_signatures',
  '_digital_signatures_ledger',
  '_executedServiceTasks'
])

function hashValue (value) {
  return createHash('sha256').update(String(value)).digest('hex')
}

function stableStringify (value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map(item => stableStringify(item)).join(',')}]`
  }

  const keys = Object.keys(value).sort()

  return `{${keys.map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`
}

function hashCanonical (value) {
  return hashValue(stableStringify(value))
}

function extractStageEntries (transactionData = {}) {
  return Object.entries(transactionData || {})
    .filter(([key, value]) => {
      if (INTERNAL_DATA_KEYS.has(key) || key.startsWith('_')) {
        return false
      }

      return value && typeof value === 'object'
    })
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([stageCode, stageData]) => ({
      stage_code: stageCode,
      stage_data: stageData
    }))
}

function computeStageDataHash (stageData) {
  return hashCanonical(stageData || {})
}

function computeCumulativeHashFromStages (stageEntries) {
  if (!stageEntries.length) {
    return null
  }

  return hashCanonical(stageEntries)
}

function computePreSignCumulativeHash (transactionData = {}, stageCode, variables = {}) {
  const existingEntries = extractStageEntries(transactionData)
  const pendingEntry = {
    stage_code: stageCode,
    stage_data: {
      variables
    }
  }

  return computeCumulativeHashFromStages([...existingEntries, pendingEntry])
}

function computeCumulativeHashForTransactionData (transactionData = {}) {
  return computeCumulativeHashFromStages(extractStageEntries(transactionData))
}

function buildGenesisHash ({
  transactionId,
  processCode,
  createdAt,
  schemaVersion = INTEGRITY_CHAIN_VERSION
}) {
  return hashCanonical({
    transaction_id: transactionId,
    process_code: processCode || null,
    created_at: createdAt ? new Date(createdAt).toISOString() : null,
    schema_version: schemaVersion
  })
}

function computeLinkHash ({
  linkOrder,
  transactionId,
  stageId,
  stageCode,
  stageDataHash,
  cumulativeHash,
  previousLinkHash,
  genesisHash,
  userId,
  signedAt
}) {
  return hashCanonical({
    link_order: linkOrder,
    transaction_id: transactionId,
    stage_id: stageId,
    stage_code: stageCode,
    stage_data_hash: stageDataHash,
    cumulative_hash: cumulativeHash,
    previous_link_hash: previousLinkHash || null,
    genesis_hash: genesisHash,
    user_id: userId,
    signed_at: signedAt ? new Date(signedAt).toISOString() : null
  })
}

function verifySignatureValue ({
  publicKeyPem,
  message,
  signatureBase64
}) {
  try {
    const publicKey = createPublicKey(publicKeyPem)

    return verify(
      null,
      Buffer.from(message, 'utf8'),
      publicKey,
      Buffer.from(signatureBase64, 'base64')
    )
  } catch {
    return false
  }
}

function buildQrPayload ({
  transactionId,
  genesisHash,
  headHash,
  totalLinks,
  chainStatus
}) {
  const verifyUrl =
    `${API_PUBLIC_URL}/api/transaction/${transactionId}/integrity-chain/verify`

  return {
    v: 1,
    tx: transactionId,
    genesis: genesisHash,
    head: headHash,
    links: totalLinks,
    status: chainStatus,
    verify_url: verifyUrl
  }
}

module.exports = {
  INTEGRITY_CHAIN_VERSION,
  INTERNAL_DATA_KEYS,
  hashValue,
  stableStringify,
  hashCanonical,
  extractStageEntries,
  computeStageDataHash,
  computeCumulativeHashFromStages,
  computePreSignCumulativeHash,
  computeCumulativeHashForTransactionData,
  buildGenesisHash,
  computeLinkHash,
  verifySignatureValue,
  buildQrPayload
}
