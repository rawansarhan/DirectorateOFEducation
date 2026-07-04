'use strict'

const typeDocRepository = require('../../../requirements/typeDoc/repositories/typeDocRepository')
const { buildStoredFileEntry } = require('../../../../core/utils/filePath')
const { pickTypeDocIdFromObject } = require('../../../../core/utils/typeDocId')
const { decodeMultipartFilename } = require('../../../../core/utils/uploadFilename')
const {
  createUploadError,
  safeUnlinkUpload,
  normalizePickerKey,
  processStagedFileUpload,
  computeFileContentHash
} = require('./stagedFileUploadService')

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

function buildUploadResponse ({
  pickerKey,
  staged,
  file,
  typeDoc,
  userId
}) {
  const stored = buildStoredFileEntry(
    {
      key: pickerKey,
      path: staged.path,
      original_name: staged.original_name,
      mime_type: staged.mime_type
    },
    userId
  )

  return {
    key: pickerKey,
    path: stored.path,
    url: stored.url,
    original_name: stored.original_name,
    mime_type: stored.mime_type,
    type_doc_id: typeDoc.id,
    type_doc: {
      id: typeDoc.id,
      name: typeDoc.name
    },
    content_hash: staged.content_hash,
    already_exists: staged.already_exists
  }
}

async function buildTransactionFileUploadResult ({
  file,
  key = null,
  typeDocId,
  userId
}) {
  const pickerKey = normalizePickerKey(key, { required: true })
  const resolvedTypeDocId = pickTypeDocIdFromObject({ type_doc_id: typeDocId })

  if (!resolvedTypeDocId) {
    safeUnlinkUpload(`/uploads/${file?.filename}`)
    throw createUploadError('type_doc_id مطلوب ويجب أن يكون رقماً موجباً')
  }

  const typeDoc = await resolveActiveTypeDoc(resolvedTypeDocId)

  const staged = await processStagedFileUpload({
    file,
    userId,
    pickerKey,
    typeDocId: typeDoc.id
  })

  return buildUploadResponse({
    pickerKey,
    staged,
    file: file || {
      originalname: staged.original_name,
      mimetype: staged.mime_type
    },
    typeDoc,
    userId
  })
}

module.exports = {
  buildTransactionFileUploadResult,
  computeFileContentHash
}
