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
// تستخدم هذه الدالة ل انشاء مدخل للملف في قاعدة البيانات
function buildStoredFileEntry (file, userId) {
  const storedPath = normalizeStoredFilePath(file.path)

  return {
    name: file.name,
    path: storedPath,
    url: toPublicFileUrl(storedPath),
    original_name: file.original_name || file.originalName || file.name,
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
 
function enrichFilePickerWidget (widget) {
  if (!widget || widget.widget_type !== 'file_picker') {
    return widget
  }

  const rawValue = widget.value

  if (Array.isArray(rawValue)) {
    return {
      ...widget,
      value: rawValue.map(item => {
        if (typeof item === 'string') {
          const storedPath = normalizeStoredFilePath(item)

          return {
            path: storedPath,
            url: toPublicFileUrl(storedPath)
          }
        }

        if (item && typeof item === 'object') {
          return enrichFileEntry(item)
        }

        return item
      })
    }
  }

  if (typeof rawValue === 'string' && rawValue.trim()) {
    const storedPath = normalizeStoredFilePath(rawValue)

    return {
      ...widget,
      value: {
        path: storedPath,
        url: toPublicFileUrl(storedPath)
      }
    }
  }

  return widget
}

function isStageFormSnapshot (stageData) {
  return Boolean(
    stageData &&
    typeof stageData === 'object' &&
    Array.isArray(stageData.widgets)
  )
}

function enrichStageSnapshot (stageData = {}) {
  if (!stageData || typeof stageData !== 'object') {
    return stageData
  }

  if (isStageFormSnapshot(stageData)) {
    return {
      ...stageData,
      widgets: stageData.widgets.map(enrichFilePickerWidget)
    }
  }

  return {
    ...stageData,
    files: Array.isArray(stageData.files)
      ? stageData.files.map(enrichFileEntry)
      : stageData.files
  }
}

function enrichStagesData (stagesData = {}) {
  if (isStageFormSnapshot(stagesData)) {
    return enrichStageSnapshot(stagesData)
  }

  const enriched = {}

  for (const [stageCode, stageData] of Object.entries(stagesData)) {
    enriched[stageCode] = enrichStageSnapshot(stageData)
  }

  return enriched
}

module.exports = {
  getApiBaseUrl,
  normalizeStoredFilePath,
  toPublicFileUrl,
  buildStoredFileEntry,
  enrichFileEntry,
  enrichFilePickerWidget,
  enrichStageSnapshot,
  isStageFormSnapshot,
  enrichStagesData
}
