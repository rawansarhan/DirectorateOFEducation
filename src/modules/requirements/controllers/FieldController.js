'use strict'
const asyncHandler = require('../../../core/middleware/asyncHandler')

const {
  createFieldService,
  updateFieldService,
  getAllFieldsService,
  getOneActiveFieldService
} = require('../services/field')

///// ============================== create new Field  ====================================

const createField = asyncHandler(async (req, res) => {
  try{
  const fieldData = req.body
  const newField = await createFieldService(fieldData)
  return res.status(200).json({
    message: 'تم انشاء الحقل بنجاح !',
    data: newField
  })}
  catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    })

}})

/// =============================  update field ==========================================

const updateField = asyncHandler(async (req, res) => {
 try{ const FieldData = req.body
  const FieldId = req.params.id
  const updated = await updateFieldService(FieldData, FieldId)
  return res.status(200).json({
    message: 'تم تعديل الحقل بنجاح !',
    data: updated
  })}
  catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    })}
})

////============================ get all field =====================================

const getAllField = asyncHandler(async (req, res) => {
  try{const fields = await getAllFieldsService()
  return res.status(200).json({
    message: 'عرض كل الحقول بنجاح !',
    data: fields
  })}
  catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    })}
})
 //=========================================
// GET ONE ACTIVE
// =========================================
const getOneActiveField = asyncHandler(
  async (req, res) => {

 try{   const result =
      await getOneActiveFieldService(
        req.params.id
      )

    return res.status(200).json(result)}
    catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    })}
  }
)
module.exports = {
 createField,
 updateField,
 getAllField,
 getOneActiveField
}
