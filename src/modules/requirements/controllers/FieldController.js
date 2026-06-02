'use strict'

const asyncHandler = require('../../../core/middleware/asyncHandler')
const { sendOk, sendCreated, sendControllerError } = require('../../../core/utils/controllerResponse')

const {
  createFieldService,
  updateFieldService,
  getAllFieldsService,
  getOneActiveFieldService
} = require('../services/field')

const createField = asyncHandler(async (req, res) => {
  try {
    const newField = await createFieldService(req.body)
    return sendOk(res, newField, 'تم انشاء الحقل بنجاح !')
  } catch (err) {
    return sendControllerError(res, err)
  }
})

const updateField = asyncHandler(async (req, res) => {
  try {
    const updated = await updateFieldService(req.body, req.params.id)
    return sendOk(res, updated, 'تم تعديل الحقل بنجاح !')
  } catch (err) {
    return sendControllerError(res, err)
  }
})

const getAllField = asyncHandler(async (req, res) => {
  try {
    const fields = await getAllFieldsService()
    return sendOk(res, fields, 'عرض كل الحقول بنجاح !')
  } catch (err) {
    return sendControllerError(res, err)
  }
})

const getOneActiveField = asyncHandler(async (req, res) => {
  try {
    const result = await getOneActiveFieldService(req.params.id)
    return sendOk(res, result, 'تم جلب الحقل بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
})

module.exports = {
  createField,
  updateField,
  getAllField,
  getOneActiveField
}
