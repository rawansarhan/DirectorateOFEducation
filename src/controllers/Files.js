'use strict'

const asyncHandler = require('../middleware/asyncHandler')
const {
  createFileService,
  updateFileService,
  getAllFilesService
} = require('../services/files')

///// ============================== create new File  ====================================

const createFile = asyncHandler(async (req, res) => {
  const FileData = req.body
  const newFile = await createFileService(FileData)
  return res.status(200).json({
    message: 'تم انشاء الملف بنجاح !',
    data: newFile
  })
})

/// =============================  update file ==========================================

const updateFile = asyncHandler(async (req, res) => {
  const FileData = req.body
  const FileId = req.params.id
  const updated = await updateFileService(FileData, FileId)
  return res.status(200).json({
    message: 'تم تعديل الملف بنجاح !',
    data: updated
  })
})

////============================ get all file =====================================

const getAllFile = asyncHandler(async (req, res) => {
  const files = await getAllFilesService()
  return res.status(200).json({
    message: 'عرض كل الملفات بنجاح !',
    data: files
  })
})

module.exports = {
 createFile,
 updateFile,
 getAllFile
}
