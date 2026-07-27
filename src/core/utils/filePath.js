const path = require('path')
const fs = require('fs')
const { UPLOADS_DIR, API_PUBLIC_URL } = require('../config/env')

/** جذر المشروع (…/DirectorateOFEducation) — ثابت بغضّ النظر عن process.cwd() */
const PROJECT_ROOT = path.resolve(__dirname, '../../..')

function getUploadsRoot () {
  const configured = UPLOADS_DIR

  if (configured && String(configured).trim()) {
    return path.isAbsolute(configured)
      ? configured
      : path.join(PROJECT_ROOT, configured)
  }

  return path.join(PROJECT_ROOT, 'uploads')
}

function ensureUploadsRoot () {
  const root = getUploadsRoot()

  if (!fs.existsSync(root)) {
    fs.mkdirSync(root, { recursive: true })
  }

  return root
}

/**
 * يحوّل مسار مخزّن مثل /uploads/file.pdf إلى مسار مطلق على القرص.
 * يستخدم مجلد uploads الثابت بجانب المشروع — لا يعتمد على process.cwd().
 */
function resolveAbsoluteUploadPath (storedPath) {
  const normalized = normalizeStoredFilePath(storedPath)

  if (!normalized) {
    throw new Error('مسار الملف غير صالح')
  }

  const relative = normalized.replace(/^\/+/, '')
  const uploadsPrefix = 'uploads/'

  if (!relative.toLowerCase().startsWith(uploadsPrefix)) {
    throw new Error('مسار الملف يجب أن يكون تحت /uploads/')
  }

  return path.join(getUploadsRoot(), relative.slice(uploadsPrefix.length))
}

function getApiBaseUrl () {
  return API_PUBLIC_URL
}

/**
 * مسار اصطناعي لسجل توقيع USB في document_signature — ليس ملفًا على القرص.
 * يُنشأ في persistVerifiedSignature بصيغة transaction://{txId}/stage/{stageId}
 */
function isSyntheticSignatureDocumentPath (filePath) {
  const value = String(filePath || '').trim()
  return value.startsWith('transaction://')
}

function normalizeStoredFilePath (filePath) {
  if (!filePath || typeof filePath !== 'string') {
    return null
  }

  // لا تُحوَّل مسارات التوقيع الاصطناعي إلى /uploads/<basename> بالخطأ
  if (isSyntheticSignatureDocumentPath(filePath)) {
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
  PROJECT_ROOT,
  getUploadsRoot,
  ensureUploadsRoot,
  resolveAbsoluteUploadPath,
  getApiBaseUrl,
  isSyntheticSignatureDocumentPath,
  normalizeStoredFilePath,
  toPublicFileUrl,
  buildStoredFileEntry,
  enrichFileEntry,
  enrichFilePickerWidget,
  enrichStageSnapshot,
  isStageFormSnapshot,
  enrichStagesData
}
