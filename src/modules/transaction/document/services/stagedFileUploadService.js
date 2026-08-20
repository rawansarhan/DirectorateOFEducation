'use strict'

const fs = require('fs')
const { createHash } = require('crypto')

const pendingFileUploadRepository = require('../repositories/pendingFileUploadRepository')
const {
  normalizeStoredFilePath,
  toPublicFileUrl,
  resolveAbsoluteUploadPath
} = require('../../../../core/utils/filePath')
const { decodeMultipartFilename } = require('../../../../core/utils/uploadFilename')
const {
  TRANSACTION_UPLOAD_DAILY_MAX_FILES,
  TRANSACTION_UPLOAD_DAILY_MAX_MB
} = require('../../../../core/config/env')

const TEMPLATE_EXTRACT_PICKER_KEY = 'document_template_extract'

function createUploadError (message, code = 'VALIDATION_ERROR', statusCode = 400) {
  const err = new Error(message)
  err.code = code
  err.statusCode = statusCode
  return err
}

async function computeFileContentHash (absolutePath) {
  const hash = createHash('sha256')
  const stream = fs.createReadStream(absolutePath)

  for await (const chunk of stream) {
    hash.update(chunk)
  }

  return hash.digest('hex')
}

function safeUnlinkUpload (storedPath) {
  if (!storedPath) {
    return
  }

  try {
    const absolutePath = resolveAbsoluteUploadPath(storedPath)

    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath)
    }
  } catch {}
}

function normalizePickerKey (key, { required = true, fallback = null } = {}) {
  const pickerKey = typeof key === 'string' ? key.trim() : ''

  if (!pickerKey) {
    if (fallback) {
      return fallback
    }

    if (required) {
      throw createUploadError(
        'key مطلوب — أرسل معرّف file_picker (data.id) مثل national_id_files'
      )
    }

    return null
  }

  if (pickerKey.length > 128) {
    throw createUploadError('key طويل جداً — الحد الأقصى 128 حرفاً')
  }

  return pickerKey
}

async function assertWithinUploadQuota (userId, fileSizeBytes = 0) {
  const [countToday, bytesToday] = await Promise.all([
    pendingFileUploadRepository.countTodayUploadsByUser(userId),
    pendingFileUploadRepository.sumTodayUploadBytesByUser(userId)
  ])

  if (countToday >= TRANSACTION_UPLOAD_DAILY_MAX_FILES) {
    throw createUploadError(
      `تجاوزت حد الرفع اليومي (${TRANSACTION_UPLOAD_DAILY_MAX_FILES} ملف) — حاول غداً`,
      'UPLOAD_QUOTA_EXCEEDED',
      429
    )
  }

  const maxBytes = TRANSACTION_UPLOAD_DAILY_MAX_MB * 1024 * 1024
  const nextTotal = bytesToday + (Number(fileSizeBytes) || 0)

  if (nextTotal > maxBytes) {
    throw createUploadError(
      `تجاوزت حد الحجم اليومي (${TRANSACTION_UPLOAD_DAILY_MAX_MB}MB) — حاول غداً`,
      'UPLOAD_QUOTA_EXCEEDED',
      429
    )
  }
}

/**
 * رفع مؤرّشف: dedup بالـ hash + quota — لا يحذف ملفات قديمة لنفس picker_key.
 */
async function processStagedFileUpload ({
  file,
  userId,
  pickerKey,
  typeDocId = null
}) {
  if (!file) {
    throw createUploadError(
      'الملف مطلوب — استخدم multipart field اسمه "file"',
      'FILE_REQUIRED'
    )
  }

  if (!userId) {
    throw createUploadError('المستخدم غير معرّف', 'UNAUTHORIZED', 401)
  }

  const newStoredPath = normalizeStoredFilePath(`/uploads/${file.filename}`)
  const absoluteNewPath = resolveAbsoluteUploadPath(newStoredPath)
  const contentHash = file.contentHash || await computeFileContentHash(absoluteNewPath)
  const originalName = decodeMultipartFilename(file.originalname)

  const existingByHash = await pendingFileUploadRepository.findByUserContentHash({
    userId,
    typeDocId,
    contentHash
  })

  if (
    existingByHash &&
    fs.existsSync(resolveAbsoluteUploadPath(existingByHash.file_path))
  ) {
    safeUnlinkUpload(newStoredPath)

    await pendingFileUploadRepository.createUploadRecord({
      userId,
      pickerKey,
      typeDocId,
      contentHash,
      filePath: existingByHash.file_path,
      originalName: decodeMultipartFilename(existingByHash.original_name || originalName),
      mimeType: existingByHash.mime_type || file.mimetype,
      fileSizeBytes: existingByHash.file_size_bytes || file.size
    })

    return {
      path: existingByHash.file_path,
      url: toPublicFileUrl(existingByHash.file_path),
      original_name: decodeMultipartFilename(existingByHash.original_name || originalName),
      mime_type: existingByHash.mime_type || file.mimetype,
      content_hash: contentHash,
      already_exists: true,
      picker_key: pickerKey
    }
  }

  await assertWithinUploadQuota(userId, file.size)

  await pendingFileUploadRepository.createUploadRecord({
    userId,
    pickerKey,
    typeDocId,
    contentHash,
    filePath: newStoredPath,
    originalName,
    mimeType: file.mimetype,
    fileSizeBytes: file.size
  })

  return {
    path: newStoredPath,
    url: toPublicFileUrl(newStoredPath),
    original_name: originalName,
    mime_type: file.mimetype,
    content_hash: contentHash,
    already_exists: false,
    picker_key: pickerKey
  }
}

module.exports = {
  TEMPLATE_EXTRACT_PICKER_KEY,
  createUploadError,
  computeFileContentHash,
  safeUnlinkUpload,
  resolveAbsoluteUploadPath,
  normalizePickerKey,
  assertWithinUploadQuota,
  processStagedFileUpload
}
