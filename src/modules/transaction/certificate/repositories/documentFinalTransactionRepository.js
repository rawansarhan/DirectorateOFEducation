'use strict'

const fs = require('fs')
const { DocumentFinalTransaction } = require('../../../../entities')
const {
  KEYS,
  getOrLoad,
  invalidateFinalDocument
} = require('../../../../core/cache/apiCacheService')
const { FINAL_DOCUMENT_CACHE_TTL_SECONDS } = require('../../../../core/config/env')
const {
  resolveAbsoluteUploadPath
} = require('../../../../core/utils/filePath')

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

async function deleteByTransactionId (transactionId) {
  const existing = await findByTransactionId(transactionId)

  if (!existing) {
    return null
  }

  const plain = typeof existing.get === 'function'
    ? existing.get({ plain: true })
    : existing

  if (plain.file_path) {
    try {
      const absolutePath = resolveAbsoluteUploadPath(plain.file_path)
      if (absolutePath && fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath)
      }
    } catch (_) {}
  }

  await existing.destroy()
  await invalidateFinalDocument(transactionId)

  return plain
}

async function findAllByOwnerUserId (userId) {
  const { Transaction } = require('../../../../entities')

  return DocumentFinalTransaction.findAll({
    include: [
      {
        model: Transaction,
        as: 'transaction',
        required: true,
        where: { user_id: userId },
        attributes: ['id', 'id_process', 'code', 'status', 'created_at', 'updated_at']
      }
    ],
    order: [['generated_at', 'DESC']]
  })
}

module.exports = {
  findByTransactionId,
  findByTransactionIdCached,
  upsertForTransaction,
  deleteByTransactionId,
  findAllByOwnerUserId
}
