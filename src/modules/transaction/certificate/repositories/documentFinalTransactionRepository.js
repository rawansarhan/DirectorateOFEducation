'use strict'

const { DocumentFinalTransaction } = require('../../../../entities')
const {
  KEYS,
  getOrLoad,
  invalidateFinalDocument
} = require('../../../../core/cache/apiCacheService')
const { FINAL_DOCUMENT_CACHE_TTL_SECONDS } = require('../../../../core/config/env')

async function findByTransactionId (transactionId) {
  return DocumentFinalTransaction.findOne({
    where: { transaction_id: transactionId }
  })
}

/**
 * قراءة مكاشة للوثيقة النهائية (تعيد كائناً عادياً plain).
 * تُستخدم في مسارات العرض فقط — لا تُستخدم في مسارات التعديل.
 */
async function findByTransactionIdCached (transactionId) {
  return getOrLoad(
    KEYS.finalDocument(transactionId),
    () => findByTransactionId(transactionId),
    {
      label: `final-document:tx:${transactionId}`,
      ttlSeconds: FINAL_DOCUMENT_CACHE_TTL_SECONDS
    }
  )
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
    const reloaded = await existing.reload()
    await invalidateFinalDocument(transactionId)
    return reloaded
  }

  const created = await DocumentFinalTransaction.create({
    transaction_id: transactionId,
    ...payload
  })
  await invalidateFinalDocument(transactionId)
  return created
}

module.exports = {
  findByTransactionId,
  findByTransactionIdCached,
  upsertForTransaction
}
