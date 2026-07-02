'use strict'

const typeDocRepository = require('../../../requirements/typeDoc/repositories/typeDocRepository')
const { buildStoredFileEntry } = require('../../../../core/utils/filePath')
const { pickTypeDocIdFromObject } = require('../../../../core/utils/typeDocId')

function createUploadError (message, code = 'VALIDATION_ERROR') {
  const err = new Error(message)
  err.code = code
  return err
}

async function resolveActiveTypeDoc (typeDocId) {
  if (!typeDocId) {
    throw createUploadError('type_doc_id مطلوب')
  }

  const typeDoc = await typeDocRepository.findById(typeDocId)

  if (!typeDoc) {
    throw createUploadError(`نوع الوثيقة (type_doc_id=${typeDocId}) غير موجود`)
  }

  if (typeDoc.is_active === false) {
    throw createUploadError(`نوع الوثيقة (type_doc_id=${typeDocId}) غير نشط`)
  }

  return typeDoc
}

/**
 * After multer saves the file to uploads/, build the payload item for
 * files[] in submit / complete.
 */
async function buildTransactionFileUploadResult ({
  file,
  key = null,
  typeDocId,
  userId
}) {
  if (!file) {
    throw createUploadError('الملف مطلوب — استخدم multipart field اسمه "file"', 'FILE_REQUIRED')
  }

  const resolvedTypeDocId = pickTypeDocIdFromObject({ type_doc_id: typeDocId })

  if (!resolvedTypeDocId) {
    throw createUploadError('type_doc_id مطلوب ويجب أن يكون رقماً موجباً')
  }

  const typeDoc = await resolveActiveTypeDoc(resolvedTypeDocId)
  const storedPath = `/uploads/${file.filename}`
  const widgetKey =
    typeof key === 'string' && key.trim()
      ? key.trim()
      : null

  const stored = buildStoredFileEntry(
    {
      key: widgetKey || file.fieldname || 'file',
      path: storedPath,
      original_name: file.originalname,
      mime_type: file.mimetype
    },
    userId
  )

  return {
    key: widgetKey,
    path: stored.path,
    url: stored.url,
    original_name: stored.original_name,
    mime_type: stored.mime_type,
    type_doc_id: typeDoc.id,
    type_doc: {
      id: typeDoc.id,
      name: typeDoc.name
    }
  }
}

module.exports = {
  buildTransactionFileUploadResult
}
