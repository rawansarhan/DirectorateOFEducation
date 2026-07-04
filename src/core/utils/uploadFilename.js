'use strict'

/**
 * Multer/busboy يمرّر filename أحياناً كـ latin1 بينما المتصفح أرسل UTF-8
 * فيظهر "Ù...Ø..." بدل العربية — نصلّح قبل التخزين/العرض.
 */
function decodeMultipartFilename (name) {
  if (name == null) {
    return ''
  }

  const trimmed = String(name).trim()

  if (!trimmed) {
    return ''
  }

  const utf8Star = trimmed.match(/(?:UTF-8|utf-8)''(.+)/)

  if (utf8Star) {
    try {
      return decodeURIComponent(utf8Star[1].replace(/\+/g, '%20'))
    } catch {}
  }

  if (/[\u0600-\u06FF]/.test(trimmed)) {
    return trimmed
  }

  const fromLatin1 = Buffer.from(trimmed, 'latin1').toString('utf8')

  if (fromLatin1.includes('\uFFFD')) {
    return trimmed
  }

  const looksMojibake = /[ØÙÃÂÐÑ]/.test(trimmed)
  const hasArabic = /[\u0600-\u06FF]/.test(fromLatin1)

  if (hasArabic || (looksMojibake && fromLatin1 !== trimmed)) {
    return fromLatin1
  }

  return trimmed
}

function normalizeUploadedFile (file) {
  if (!file || typeof file !== 'object') {
    return
  }

  if (file.originalname != null) {
    file.originalname = decodeMultipartFilename(file.originalname)
  }
}

function normalizeUploadedFiles (req) {
  normalizeUploadedFile(req.file)

  if (Array.isArray(req.files)) {
    req.files.forEach(normalizeUploadedFile)
    return
  }

  if (req.files && typeof req.files === 'object') {
    for (const group of Object.values(req.files)) {
      if (Array.isArray(group)) {
        group.forEach(normalizeUploadedFile)
      } else {
        normalizeUploadedFile(group)
      }
    }
  }
}

module.exports = {
  decodeMultipartFilename,
  normalizeUploadedFile,
  normalizeUploadedFiles
}
