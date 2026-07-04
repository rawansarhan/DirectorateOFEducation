'use strict'

const { Op } = require('sequelize')
const { PendingFileUpload } = require('../../../../entities')
const { normalizeStoredFilePath } = require('../../../../core/utils/filePath')

function startOfUtcDay (date = new Date()) {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  ))
}

async function findByUserContentHash ({ userId, typeDocId = undefined, contentHash }) {
  const where = {
    user_id: userId,
    content_hash: contentHash
  }

  if (typeDocId !== undefined && typeDocId !== null) {
    where.type_doc_id = typeDocId
  }

  return PendingFileUpload.findOne({
    where,
    order: [['updated_at', 'DESC']]
  })
}

async function findByUserTypeAndHash ({ userId, typeDocId, contentHash }) {
  return findByUserContentHash({ userId, typeDocId, contentHash })
}

async function findByUserPickerAndType ({ userId, pickerKey, typeDocId }) {
  return PendingFileUpload.findOne({
    where: {
      user_id: userId,
      picker_key: pickerKey,
      type_doc_id: typeDocId
    }
  })
}

async function findByPathAndUser (filePath, userId) {
  const storedPath = normalizeStoredFilePath(filePath)

  if (!storedPath) {
    return null
  }

  return PendingFileUpload.findOne({
    where: {
      user_id: userId,
      file_path: storedPath
    },
    order: [['updated_at', 'DESC']]
  })
}

async function countTodayUploadsByUser (userId) {
  return PendingFileUpload.count({
    where: {
      user_id: userId,
      created_at: {
        [Op.gte]: startOfUtcDay()
      }
    }
  })
}

async function sumTodayUploadBytesByUser (userId) {
  const total = await PendingFileUpload.sum('file_size_bytes', {
    where: {
      user_id: userId,
      created_at: {
        [Op.gte]: startOfUtcDay()
      }
    }
  })

  return Number(total) || 0
}

async function createUploadRecord ({
  userId,
  pickerKey,
  typeDocId,
  contentHash,
  filePath,
  originalName,
  mimeType,
  fileSizeBytes
}) {
  const storedPath = normalizeStoredFilePath(filePath)
  const existing = await findByPathAndUser(storedPath, userId)

  if (existing) {
    return existing
  }

  return PendingFileUpload.create({
    user_id: userId,
    picker_key: pickerKey,
    type_doc_id: typeDocId ?? null,
    content_hash: contentHash,
    file_path: storedPath,
    original_name: originalName ?? null,
    mime_type: mimeType ?? null,
    file_size_bytes: fileSizeBytes ?? null,
    status: 'pending'
  })
}

async function markAttachedByPath (filePath, userId) {
  const storedPath = normalizeStoredFilePath(filePath)

  if (!storedPath) {
    return null
  }

  const row = await findByPathAndUser(storedPath, userId)

  if (!row) {
    return null
  }

  if (row.status !== 'attached') {
    await row.update({ status: 'attached' })
  }

  return row.reload()
}

module.exports = {
  findByUserContentHash,
  findByUserTypeAndHash,
  findByUserPickerAndType,
  findByPathAndUser,
  countTodayUploadsByUser,
  sumTodayUploadBytesByUser,
  createUploadRecord,
  markAttachedByPath
}
