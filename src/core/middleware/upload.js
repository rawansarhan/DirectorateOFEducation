'use strict'

const multer = require('multer')
const path = require('path')

// =========================================
// STORAGE
// =========================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/')
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)

    const filename =
      Date.now() + '-' + Math.round(Math.random() * 1e9) + ext

    cb(null, filename)
  }
})

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

const TRANSACTION_FILE_MAX_MB = Number(process.env.TRANSACTION_FILE_MAX_MB) || 25

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
  storage,
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
    cb(null, 'uploads/')
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

      next()
    })
  }
}

module.exports = {
  uploadBPMN,
  uploadDocumentTemplate,
  uploadTransactionFile,
  uploadFinalTransactionPdf,
  TRANSACTION_FILE_MAX_MB,
  TRANSACTION_FILE_EXTENSIONS,
  runMulterUpload
}