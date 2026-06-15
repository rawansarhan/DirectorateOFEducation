'use strict'

const { DocumentFinalTransaction } = require('../../../../entities')

async function findByTransactionId (transactionId) {
  return DocumentFinalTransaction.findOne({
    where: { transaction_id: transactionId }
  })
}

async function upsertForTransaction ({
  transactionId,
  filePath,
  originalName,
  mimeType,
  fileSizeBytes,
  qrPayloadSnapshot,
  generatedByUserId,
  generatedAt = new Date()
}) {
  const existing = await findByTransactionId(transactionId)

  const payload = {
    file_path: filePath,
    original_name: originalName ?? null,
    mime_type: mimeType || 'application/pdf',
    file_size_bytes: fileSizeBytes ?? null,
    qr_payload_snapshot: qrPayloadSnapshot ?? null,
    generated_by_user_id: generatedByUserId ?? null,
    generated_at: generatedAt
  }

  if (existing) {
    await existing.update(payload)
    return existing.reload()
  }

  return DocumentFinalTransaction.create({
    transaction_id: transactionId,
    ...payload
  })
}

module.exports = {
  findByTransactionId,
  upsertForTransaction
}
