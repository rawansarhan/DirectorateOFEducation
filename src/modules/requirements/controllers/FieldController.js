'use strict'
const asyncHandler = require('../../../core/middleware/asyncHandler')
const ApiResponder = require('../../../core/utils/apiResponder')

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
  return ApiResponder.okResponse(res, newField, 'تم انشاء الحقل بنجاح !')}
  catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)

}})

/// =============================  update field ==========================================

const updateField = asyncHandler(async (req, res) => {
 try{ const FieldData = req.body
  const FieldId = req.params.id
  const updated = await updateFieldService(FieldData, FieldId)
  return ApiResponder.okResponse(res, updated, 'تم تعديل الحقل بنجاح !')}
  catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)}
})

////============================ get all field =====================================

const getAllField = asyncHandler(async (req, res) => {
  try{const fields = await getAllFieldsService()
  return ApiResponder.okResponse(res, fields, 'عرض كل الحقول بنجاح !')}
  catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)}
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

    return ApiResponder.okResponse(res, result)}
    catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)}
  }
)
module.exports = {
 createField,
 updateField,
 getAllField,
 getOneActiveField
}
