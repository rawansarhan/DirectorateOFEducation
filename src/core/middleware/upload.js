'use strict'

const fs = require('fs')
const path = require('path')
const { pipeline, Transform } = require('stream')
const { createHash } = require('crypto')
const multer = require('multer')
const { TRANSACTION_FILE_MAX_MB } = require('../config/env')
const { normalizeUploadedFiles } = require('../utils/uploadFilename')
const { ensureUploadsRoot } = require('../utils/filePath')

function buildUploadFilename (originalName) {
  const ext = path.extname(originalName || '')
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`
}

// =========================================
// STORAGE — مجلد uploads ثابت بجذر المشروع
// =========================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, ensureUploadsRoot())
  },

  filename: (req, file, cb) => {
    cb(null, buildUploadFilename(file.originalname))
  }
})

/**
 * يكتب الملف على القرص ويحسب SHA-256 في نفس الـ stream
 * حتى لا نعيد قراءة الملف بعد انتهاء Multer.
 */
function hashingDiskStorage () {
  return {
    _handleFile (req, file, cb) {
      const destination = ensureUploadsRoot()
      const filename = buildUploadFilename(file.originalname)
      const absolutePath = path.join(destination, filename)
      const hash = createHash('sha256')
      const hasher = new Transform({
        transform (chunk, _enc, next) {
          hash.update(chunk)
          next(null, chunk)
        }
      })
      const outStream = fs.createWriteStream(absolutePath)

      pipeline(file.stream, hasher, outStream, (err) => {
        if (err) {
          fs.unlink(absolutePath, () => cb(err))
          return
        }

        cb(null, {
          destination,
          filename,
          path: absolutePath,
          size: outStream.bytesWritten,
          contentHash: hash.digest('hex')
        })
      })
    },

    _removeFile (req, file, cb) {
      fs.unlink(file.path, () => cb(null))
    }
  }
}

// =========================================
// BPMN ONLY
// =========================================
const bpmnFilter = (req, file, cb) => {

  const isBpmn =
    file.mimetype.includes('xml') ||
    file.originalname.endsWith('.bpmn')

  if (!isBpmn) {
    return cb(new Error('فقط ملفات BPMN مسموحة'))
  }

  cb(null, true)
}

// =========================================
// DOCUMENT TEMPLATE
// =========================================
const documentTemplateFilter = (req, file, cb) => {

  const allowedExt = [
    '.pdf',
    '.docx',
    '.html'
  ]

  const ext = path.extname(file.originalname).toLowerCase()

  if (!allowedExt.includes(ext)) {
    return cb(
      new Error('فقط ملفات pdf/docx/html مسموحة')
    )
  }

  cb(null, true)
}

// =========================================
// EXPORTS
// =========================================
const uploadBPMN = multer({
  storage,
  fileFilter: bpmnFilter
})

const uploadDocumentTemplate = multer({
  storage,
  fileFilter: documentTemplateFilter
})

// =========================================
// TRANSACTION / WORKFLOW ATTACHMENTS
// =========================================
const TRANSACTION_FILE_EXTENSIONS = [
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.doc',
  '.docx'
]

const transactionFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase()

  if (!TRANSACTION_FILE_EXTENSIONS.includes(ext)) {
    return cb(
      new Error(
        `نوع الملف غير مسموح — المسموح: ${TRANSACTION_FILE_EXTENSIONS.map(item => item.slice(1)).join(', ')}`
      )
    )
  }

  cb(null, true)
}

const uploadTransactionFile = multer({
  storage: hashingDiskStorage(),
  fileFilter: transactionFileFilter,
  limits: {
    fileSize: TRANSACTION_FILE_MAX_MB * 1024 * 1024,
    files: 1
  }
})

const finalTransactionPdfFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase()

  if (ext !== '.pdf' && file.mimetype !== 'application/pdf') {
    return cb(new Error('فقط ملفات PDF مسموحة للوثيقة النهائية'))
  }

  cb(null, true)
}

const finalTransactionStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, ensureUploadsRoot())
  },
  filename: (req, file, cb) => {
    const txId = String(req.params?.transactionId || 'unknown')
    cb(null, `final-${txId}-${Date.now()}.pdf`)
  }
})

const uploadFinalTransactionPdf = multer({
  storage: finalTransactionStorage,
  fileFilter: finalTransactionPdfFilter,
  limits: {
    fileSize: TRANSACTION_FILE_MAX_MB * 1024 * 1024,
    files: 1
  }
})

function runMulterUpload (middleware) {
  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (err) {
        return next(err)
      }

      normalizeUploadedFiles(req)
      next()
    })
  }
}

const IDENTITY_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp']

const identityImageFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase()

  if (!IDENTITY_IMAGE_EXTENSIONS.includes(ext)) {
    return cb(
      new Error(
        `نوع صورة الهوية غير مسموح — المسموح: ${IDENTITY_IMAGE_EXTENSIONS.map(item => item.slice(1)).join(', ')}`
      )
    )
  }

  cb(null, true)
}

const uploadIdentityImage = multer({
  storage,
  fileFilter: identityImageFilter,
  limits: {
    fileSize: TRANSACTION_FILE_MAX_MB * 1024 * 1024,
    files: 1
  }
})

module.exports = {
  uploadBPMN,
  uploadDocumentTemplate,
  uploadTransactionFile,
  uploadFinalTransactionPdf,
  uploadIdentityImage,
  TRANSACTION_FILE_MAX_MB,
  TRANSACTION_FILE_EXTENSIONS,
  IDENTITY_IMAGE_EXTENSIONS,
  runMulterUpload
}