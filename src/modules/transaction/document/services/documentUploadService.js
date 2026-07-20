'use strict'

const typeDocRepository = require('../../../requirements/typeDoc/repositories/typeDocRepository')
const { buildStoredFileEntry } = require('../../../../core/utils/filePath')
const { pickTypeDocIdFromObject } = require('../../../../core/utils/typeDocId')
const {
  createUploadError,
  safeUnlinkUpload,
  normalizePickerKey,
  processStagedFileUpload,
  computeFileContentHash
} = require('./stagedFileUploadService')
const {
  toUploadInput,
  toUploadOutputDTO
} = require('../mappers/documentMapper')

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

  return toUploadOutputDTO({
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
  })
}

async function buildTransactionFileUploadResult (payload) {
  const input = toUploadInput(payload)
  const pickerKey = normalizePickerKey(input.key, { required: true })
  const resolvedTypeDocId = pickTypeDocIdFromObject({
    type_doc_id: input.typeDocId
  })

  if (!resolvedTypeDocId) {
    safeUnlinkUpload(`/uploads/${input.file?.filename}`)
    throw createUploadError('type_doc_id مطلوب ويجب أن يكون رقماً موجباً')
  }

  const typeDoc = await resolveActiveTypeDoc(resolvedTypeDocId)

  const staged = await processStagedFileUpload({
    file: input.file,
    userId: input.userId,
    pickerKey,
    typeDocId: typeDoc.id
  })

  return buildUploadResponse({
    pickerKey,
    staged,
    typeDoc,
    userId: input.userId
  })
}

module.exports = {
  buildTransactionFileUploadResult,
  computeFileContentHash
}
