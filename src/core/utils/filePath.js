const path = require('path')

function getApiBaseUrl () {
  return (
    process.env.API_PUBLIC_URL ||
    `http://localhost:${process.env.PORT || 4000}`
  )
}

function normalizeStoredFilePath (filePath) {
  if (!filePath || typeof filePath !== 'string') {
    return null
  }

  const normalized = filePath.replace(/\\/g, '/').trim()

  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    try {
      return normalizeStoredFilePath(new URL(normalized).pathname)
    } catch {
      return null
    }
  }

  const uploadsIndex = normalized.toLowerCase().indexOf('/uploads/')

  if (uploadsIndex !== -1) {
    return normalized.slice(uploadsIndex)
  }

  if (normalized.startsWith('uploads/')) {
    return `/${normalized}`
  }

  const fileName = path.posix.basename(normalized)

  return fileName ? `/uploads/${fileName}` : null
}

function toPublicFileUrl (filePath) {
  const storedPath = normalizeStoredFilePath(filePath)

  if (!storedPath) {
    return null
  }

  return `${getApiBaseUrl()}${storedPath}`
}

function buildStoredFileEntry (file, userId) {
  const storedPath = normalizeStoredFilePath(file.path)

  return {
    key: file.key,
    path: storedPath,
    url: toPublicFileUrl(storedPath),
    original_name: file.original_name || file.originalName || file.key,
    mime_type: file.mime_type || file.mimeType || null,
    uploaded_by: userId,
    uploaded_at: new Date()
  }
}

function enrichFileEntry (file) {
  if (!file || typeof file !== 'object') {
    return file
  }

  const storedPath = normalizeStoredFilePath(file.path)

  return {
    ...file,
    path: storedPath,
    url: file.url || toPublicFileUrl(storedPath)
  }
}

function enrichStagesData (stagesData = {}) {
  const enriched = {}

  for (const [stageCode, stageData] of Object.entries(stagesData)) {
    if (!stageData || typeof stageData !== 'object') {
      enriched[stageCode] = stageData
      continue
    }

    enriched[stageCode] = {
      ...stageData,
      files: Array.isArray(stageData.files)
        ? stageData.files.map(enrichFileEntry)
        : stageData.files
    }
  }

  return enriched
}

module.exports = {
  getApiBaseUrl,
  normalizeStoredFilePath,
  toPublicFileUrl,
  buildStoredFileEntry,
  enrichFileEntry,
  enrichStagesData
}
