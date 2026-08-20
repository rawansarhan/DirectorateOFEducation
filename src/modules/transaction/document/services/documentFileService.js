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
 * - name من file_picker.data.label في config_json (fallback: type_docs.name)
 * - يُخزَّن في document_signature.type_doc_id / document_signature.name
 *
 * APIs: POST /api/transaction/files/upload  ← رفع الملف (multipart)
 *       POST /api/transaction/submit/{transactionId}
 *       POST /api/workflow/tasks/{id}/complete
 *       POST /api/workflow/tasks/{id}/submit-documents/complete
 */

const fs = require('fs')
const path = require('path')
const { documentSignatureRepository } = require('../../../workflow/public')
const typeDocRepository = require('../../../requirements/typeDoc/repositories/typeDocRepository')
const pendingFileUploadRepository = require('../repositories/pendingFileUploadRepository')
const { buildStoredFileEntry, normalizeStoredFilePath, resolveAbsoluteUploadPath } = require('../../../../core/utils/filePath')
const { retryWithBackoff } = require('../../../../core/utils/retryWithBackoff')
const { pickTypeDocIdFromObject } = require('../../../../core/utils/typeDocId')

function createDocumentFileError (message) {
  const err = new Error(message)
  err.code = 'VALIDATION_ERROR'
  return err
}

/**
 * يرفض أي مسار ملف لا يشير لملف مرفوع فعلي.
 * يمنع حفظ مسارات مشوّهة مثل "/uploads/2" الناتجة عن قيمة file_picker خاطئة (مثل "2").
 * الملف يجب أن يكون مرفوعاً مسبقاً عبر POST /api/transaction/files/upload.
 */
function assertUploadedFileExists (storedPath, fileKey) {
  if (!storedPath || typeof storedPath !== 'string') {
    throw createDocumentFileError(
      `مسار الملف غير صالح للحقل "${fileKey}" — ارفع الملف عبر POST /api/transaction/files/upload ثم أرسل المسار الراجع`
    )
  }

  const fileName = path.posix.basename(storedPath)

  if (!fileName || !path.posix.extname(fileName)) {
    throw createDocumentFileError(
      `مسار الملف "${storedPath}" للحقل "${fileKey}" غير صالح — يجب أن يكون مسار ملف مرفوع مثل /uploads/<اسم-الملف>.pdf وليس قيمة عشوائية`
    )
  }

  const absolutePath = resolveAbsoluteUploadPath(storedPath)

  if (!fs.existsSync(absolutePath)) {
    throw createDocumentFileError(
      `الملف المشار إليه (${storedPath}) للحقل "${fileKey}" غير موجود — تأكد من رفعه عبر POST /api/transaction/files/upload قبل الإرسال`
    )
  }
}

async function assertUploadedFileOwnedByUser (storedPath, userId, fileKey) {
  if (!userId) {
    throw createDocumentFileError(
      `لا يمكن التحقق من ملكية الملف للحقل "${fileKey}"`
    )
  }

  const normalizedPath = normalizeStoredFilePath(storedPath)
  const ownership = await pendingFileUploadRepository.findByPathAndUser(
    normalizedPath,
    userId
  )

  if (!ownership) {
    throw createDocumentFileError(
      `الملف "${normalizedPath}" للحقل "${fileKey}" غير مرفوع من حسابك — ارفعه عبر POST /api/transaction/files/upload`
    )
  }

  return ownership
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

function buildFilePickerLabelMap (configJson = {}) {
  const labels = new Map()

  for (const widget of configJson.widgets || []) {
    if (widget?.widget_type !== 'file_picker') {
      continue
    }

    const widgetId = widget.data?.id == null
      ? ''
      : String(widget.data.id).trim()
    const label = typeof widget.data?.label === 'string'
      ? widget.data.label.trim()
      : ''

    if (widgetId && label) {
      labels.set(widgetId, label)
    }
  }

  return labels
}

function resolveStoredFileName ({ fileKey, labelMap, typeDocName }) {
  const fromWidget = fileKey ? labelMap.get(String(fileKey)) : null

  if (fromWidget) {
    return fromWidget.slice(0, 256)
  }

  if (typeof typeDocName === 'string' && typeDocName.trim()) {
    return typeDocName.trim().slice(0, 256)
  }

  return null
}

async function registerTransactionFile ({
  transactionId,
  file,
  userId,
  dbTransaction = null,
  labelMap = new Map()
}) {
  const { typeDocId, typeDoc } = await resolveTypeDoc(file)
  const fileKey = file.key || file.name || 'unknown'
  const storedName = resolveStoredFileName({
    fileKey,
    labelMap,
    typeDocName: typeDoc.name
  })

  const stored = buildStoredFileEntry(
    {
      ...file,
      name: fileKey
    },
    userId
  )

  assertUploadedFileExists(stored.path, fileKey)
  const pendingRecord = await assertUploadedFileOwnedByUser(
    stored.path,
    userId,
    fileKey
  )
  const contentHash = pendingRecord?.content_hash ?? null

  const document = await retryWithBackoff(
    () =>
      documentSignatureRepository.create(
        {
          transaction_id: transactionId,
          file_path: stored.path,
          name: storedName,
          type_doc_id: typeDocId,
          content_hash: contentHash
        },
        { transaction: dbTransaction }
      ),
    { label: `documentSignature.create:${transactionId}` }
  )

  await pendingFileUploadRepository.markAttachedByPath(stored.path, userId)

  return {
    key: fileKey,
    name: storedName,
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
  dbTransaction = null,
  configJson = null
}) {
  if (!Array.isArray(files) || !files.length) {
    return []
  }

  const labelMap = buildFilePickerLabelMap(configJson || {})
  const registered = []

  for (const file of files) {
    registered.push(
      await registerTransactionFile({
        transactionId,
        file,
        userId,
        dbTransaction,
        labelMap
      })
    )
  }

  return registered
}

module.exports = {
  registerTransactionFile,
  registerTransactionFiles
}
