'use strict'

const asyncHandler = require('../../../core/middleware/asyncHandler')
const { sendOk, sendControllerError } = require('../../../core/utils/controllerResponse')

const {
  createFileService,
  updateFileService,
  getAllFilesService,
  getOneActiveFileService
} = require('../services/files')

const createFile = asyncHandler(async (req, res) => {
  try {
    const newFile = await createFileService(req.body)
    return sendOk(res, newFile, 'تم انشاء الملف بنجاح !')
  } catch (err) {
    return sendControllerError(res, err)
  }
})

const updateFile = asyncHandler(async (req, res) => {
  try {
    const updated = await updateFileService(req.body, req.params.id)
    return sendOk(res, updated, 'تم تعديل الملف بنجاح !')
  } catch (err) {
    return sendControllerError(res, err)
  }
})

const getAllFile = asyncHandler(async (req, res) => {
  try {
    const files = await getAllFilesService()
    return sendOk(res, files, 'عرض كل الملفات بنجاح !')
  } catch (err) {
    return sendControllerError(res, err)
  }
})

const getOneActiveFile = asyncHandler(async (req, res) => {
  try {
    const result = await getOneActiveFileService(req.params.id)
    return sendOk(res, result, 'تم جلب الملف بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
})

module.exports = {
  createFile,
  updateFile,
  getAllFile,
  getOneActiveFile
}
