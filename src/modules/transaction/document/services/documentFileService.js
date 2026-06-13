'use strict'

/**
 * =============================================================================
 * documentFileService — تسجيل الملفات المرفوعة في document_signature
 * =============================================================================
 *
 * عند complete / submit / submit-documents مع files[]:
 *   { key, path, type_doc_id }
 *
 * - type_doc_id من stage_config (file_picker.data.type_doc_id) أو من files[] في الطلب
 * - يُخزَّن في document_signature.type_doc_id
 *
 * APIs: POST /api/transaction/files/upload  ← رفع الملف (multipart)
 *       POST /api/transaction/submit/{transactionId}
 *       POST /api/workflow/tasks/{id}/complete
 *       POST /api/workflow/tasks/{id}/submit-documents/complete
 */

const documentSignatureRepository = require('../../../workflow/taskCamunda/repositories/documentSignatureRepository')
const typeDocRepository = require('../../../requirements/typeDoc/repositories/typeDocRepository')
const { buildStoredFileEntry } = require('../../../../core/utils/filePath')
const { retryWithBackoff } = require('../../../../core/utils/retryWithBackoff')
const { pickTypeDocIdFromObject } = require('../../../../core/utils/typeDocId')

function createDocumentFileError (message) {
  const err = new Error(message)
  err.code = 'VALIDATION_ERROR'
  return err
}

async function resolveTypeDoc (file = {}) {
  const typeDocId = pickTypeDocIdFromObject(file)
  const fileKey = file.key || file.name || 'unknown'

  if (!typeDocId) {
    throw createDocumentFileError(
      `type_doc_id مطلوب للملف "${fileKey}"`
    )
  }

  const typeDoc = await typeDocRepository.findById(typeDocId)

  if (!typeDoc) {
    throw createDocumentFileError(
      `نوع الوثيقة (type_doc_id=${typeDocId}) غير موجود للملف "${fileKey}"`
    )
  }

  if (typeDoc.is_active === false) {
    throw createDocumentFileError(
      `نوع الوثيقة (type_doc_id=${typeDocId}) غير نشط للملف "${fileKey}"`
    )
  }

  return { typeDocId, typeDoc }
}

async function registerTransactionFile ({
  transactionId,
  file,
  userId,
  dbTransaction = null
}) {
  const { typeDocId, typeDoc } = await resolveTypeDoc(file)

  const stored = buildStoredFileEntry(
    {
      ...file,
      name: file.key || file.name
    },
    userId
  )

  const document = await retryWithBackoff(
    () =>
      documentSignatureRepository.create(
        {
          transaction_id: transactionId,
          file_path: stored.path,
          type_doc_id: typeDocId
        },
        { transaction: dbTransaction }
      ),
    { label: `documentSignature.create:${transactionId}` }
  )

  return {
    key: file.key || file.name,
    path: stored.path,
    url: stored.url,
    original_name: stored.original_name,
    mime_type: stored.mime_type,
    type_doc_id: typeDocId,
    type_doc: {
      id: typeDoc.id,
      name: typeDoc.name
    },
    document_id: document.id
  }
}

async function registerTransactionFiles ({
  transactionId,
  files = [],
  userId,
  dbTransaction = null
}) {
  if (!Array.isArray(files) || !files.length) {
    return []
  }

  const registered = []

  for (const file of files) {
    registered.push(
      await registerTransactionFile({
        transactionId,
        file,
        userId,
        dbTransaction
      })
    )
  }

  return registered
}

module.exports = {
  registerTransactionFile,
  registerTransactionFiles
}
