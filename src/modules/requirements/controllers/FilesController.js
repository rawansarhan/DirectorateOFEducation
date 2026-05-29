'use strict'
const asyncHandler = require('../../../core/middleware/asyncHandler')

const {
  createFileService,
  updateFileService,
  getAllFilesService,
  getOneActiveFileService
} = require('../services/files')

///// ============================== create new File  ====================================

const createFile = asyncHandler(async (req, res) => {
  try {
    const FileData = req.body
    const newFile = await createFileService(FileData)
    return res.status(200).json({
      message: 'تم انشاء الملف بنجاح !',
      data: newFile
    })
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    })
  }
})

/// =============================  update file ==========================================

const updateFile = asyncHandler(async (req, res) => {
  try {
    const FileData = req.body
    const FileId = req.params.id
    const updated = await updateFileService(FileData, FileId)
    return res.status(200).json({
      message: 'تم تعديل الملف بنجاح !',
      data: updated
    })
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    })
  }
})

////============================ get all file =====================================

const getAllFile = asyncHandler(async (req, res) => {
  try {
    const files = await getAllFilesService()
    return res.status(200).json({
      message: 'عرض كل الملفات بنجاح !',
      data: files
    })
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    })
  }
})
//=========================================
// GET ONE ACTIVE
// =========================================
const getOneActiveFile = asyncHandler(async (req, res) => {
  try {
    const result = await getOneActiveFileService(req.params.id)

    return res.status(200).json(result)
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    })
  }
})
module.exports = {
  createFile,
  updateFile,
  getAllFile,
  getOneActiveFile
}
