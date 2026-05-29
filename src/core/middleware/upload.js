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

module.exports = {
  uploadBPMN,
  uploadDocumentTemplate
}