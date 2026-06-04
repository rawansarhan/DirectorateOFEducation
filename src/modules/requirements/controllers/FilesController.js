'use strict'
const asyncHandler = require('../../../core/middleware/asyncHandler')
const ApiResponder = require('../../../core/utils/apiResponder')

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
    return ApiResponder.okResponse(res, newFile, 'تم انشاء الملف بنجاح !')
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
})

/// =============================  update file ==========================================

const updateFile = asyncHandler(async (req, res) => {
  try {
    const FileData = req.body
    const FileId = req.params.id
    const updated = await updateFileService(FileData, FileId)
    return ApiResponder.okResponse(res, updated, 'تم تعديل الملف بنجاح !')
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
})

////============================ get all file =====================================

const getAllFile = asyncHandler(async (req, res) => {
  try {
    const files = await getAllFilesService()
    return ApiResponder.okResponse(res, files, 'عرض كل الملفات بنجاح !')
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
})
//=========================================
// GET ONE ACTIVE
// =========================================
const getOneActiveFile = asyncHandler(async (req, res) => {
  try {
    const result = await getOneActiveFileService(req.params.id)

    return ApiResponder.okResponse(res, result)
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
})
module.exports = {
  createFile,
  updateFile,
  getAllFile,
  getOneActiveFile
}
