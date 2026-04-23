'use strict'

const asyncHandler = require('../middleware/asyncHandler')
const {
  createFieldService,
  updateFieldService,
  getAllFieldsService
} = require('../services/field')

///// ============================== create new Field  ====================================

const createField = asyncHandler(async (req, res) => {
  const fieldData = req.body
  const newField = await createFieldService(fieldData)
  return res.status(200).json({
    message: 'تم انشاء الحقل بنجاح !',
    data: newField
  })
})

/// =============================  update field ==========================================

const updateField = asyncHandler(async (req, res) => {
  const FieldData = req.body
  const FieldId = req.params.id
  const updated = await updateFieldService(FieldData, FieldId)
  return res.status(200).json({
    message: 'تم تعديل الحقل بنجاح !',
    data: updated
  })
})

////============================ get all field =====================================

const getAllField = asyncHandler(async (req, res) => {
  const fields = await getAllFieldsService()
  return res.status(200).json({
    message: 'عرض كل الحقول بنجاح !',
    data: fields
  })
})

module.exports = {
 createField,
 updateField,
 getAllField
}
