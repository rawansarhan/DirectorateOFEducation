'use strict'

const { ValidateCreateField , ValidateUpdateField } = require('../validations/fieldValidations')
const { Field } = require('../entities')
const { FieldInputDTO} = require('../dto/FieldInputDTO')
const { FieldOutputDTO } = require('../dto/FieldOutputDTO')

//// =========================================== create new field =========================== : 
async function createFieldService (fieldData) {

  try {
    const dataToValidate = { ...fieldData }
    const { error } = ValidateCreateField(dataToValidate)
    if (error) throw new Error(error.details[0].message)

    const inputFiledDTO = new FieldInputDTO({
      ...fieldData
    })

    const field = await Field.create({
      ...inputFiledDTO
    })

    return new FieldOutputDTO(field)
  } catch (err) {
    console.error('=== ERROR in createFieldService ===')
    console.error(err)
    throw err
  }
}


//////=============================================  update Field ============================== : 
async function updateFieldService (FieldData, FieldId) {

  const id = parseInt(FieldId, 10)
  if (!Number.isInteger(id) || id < 1) {
    throw new Error('معرّف الحقل غير صالح')
  }

  const { error } = ValidateUpdateField({ ...FieldData })
  if (error) throw new Error(error.details[0].message)

  const field = await Field.findByPk(id)
  if (!field) {
    const err = new Error('الحقل غير موجودة')
    err.statusCode = 404
    throw err
  }

  const payload = {}
  if (FieldData.field_name !== undefined) payload.field_name = FieldData.field_name
  if (FieldData.field_type !== undefined) payload.field_type = FieldData.field_type
  if (FieldData.list_json !== undefined) {
    payload.list_json = FieldData.list_json
  }

  await field.update(payload)
  await field.reload()

  return new FieldOutputDTO(field)
}

/////============================== get all fields ==================================== : 
async function getAllFieldsService () {
  const rows = await Field.findAll({
    order: [['id', 'ASC']]
  })
  return rows.map(row => new FieldOutputDTO(row))
}



module.exports = {
  createFieldService,
  updateFieldService,
  getAllFieldsService
}
