'use strict'

function normalizeTypeCode (code) {
  const normalized = String(code || 'TXN')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')

  return normalized || 'TXN'
}

function buildTransactionIdProcess ({
  typeTransCode,
  transactionId,
  createdAt = new Date()
}) {
  const typeCode = normalizeTypeCode(typeTransCode)
  const year = new Date(createdAt).getFullYear()
  const paddedId = String(transactionId).padStart(3, '0')

  return `${typeCode}-${year}-${paddedId}`
}

module.exports = {
  buildTransactionIdProcess,
  normalizeTypeCode
}
