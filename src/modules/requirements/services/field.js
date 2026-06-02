'use strict'

const { HTTP_STATUS } = require('../../../core/middleware/httpStatusCodes')

const { ValidateCreateField, ValidateUpdateField } = require('../validations/fieldValidations')
const fieldRepository = require('../repositories/fieldRepository')
const { FieldInputDTO } = require('../dto/FieldInputDTO')
const { FieldOutputDTO } = require('../dto/FieldOutputDTO')

//// =========================================== create new field =========================== :
async function createFieldService(fieldData) {

  try {

    const dataToValidate = { ...fieldData }

    const { error } = ValidateCreateField(dataToValidate)

    if (error) {
      throw new Error(error.details[0].message)
    }

    const inputFiledDTO = new FieldInputDTO({
      ...fieldData
    })

    // =========================================
    // CHECK LIST TYPE
    // =========================================
    const isListType =
      ['choice', 'multiChoice'].includes(inputFiledDTO.field_type)

    // =========================================
    // LIST VALIDATION
    // =========================================
    if (isListType) {

      if (
        !inputFiledDTO.list_json ||
        !Array.isArray(inputFiledDTO.list_json) ||
        inputFiledDTO.list_json.length === 0
      ) {
        throw new Error(
          'list_json is required and must be a non-empty array when field_type is choice/multiChoice'
        )
      }

      const invalidItem = inputFiledDTO.list_json.find(
        item => typeof item !== 'string' || item.trim() === ''
      )

      if (invalidItem !== undefined) {
        throw new Error(
          'All list_json items must be non-empty strings'
        )
      }

      inputFiledDTO.list_json =
        inputFiledDTO.list_json.map(item => item.trim())

      const uniqueValues = new Set(inputFiledDTO.list_json)

      if (uniqueValues.size !== inputFiledDTO.list_json.length) {
        throw new Error(
          'list_json contains duplicate values'
        )
      }

    } else {
      inputFiledDTO.list_json = null
    }

    // =========================================
    // CREATE FIELD
    // =========================================
    const field = await fieldRepository.create({
      ...inputFiledDTO
    })

    return {
      message: 'تم إنشاء الحقل بنجاح',
      data: {
        success: true,
        field: new FieldOutputDTO(field)
      }
    }

  } catch (err) {

    console.error('=== ERROR in createFieldService ===')
    console.error(err)

    throw err
  }
}


//////=============================================  update Field ============================== :
async function updateFieldService(FieldData, FieldId) {

  const id = parseInt(FieldId, 10)

  if (!Number.isInteger(id) || id < 1) {
    throw new Error('معرّف الحقل غير صالح')
  }

  // VALIDATION
  const { error } = ValidateUpdateField({
    ...FieldData
  })

  if (error) {
    throw new Error(error.details[0].message)
  }

  // GET CURRENT FIELD
  const oldField = await fieldRepository.findById(id)

  if (!oldField) {
    const err = new Error('الحقل غير موجودة')
    err.statusCode = HTTP_STATUS.NOT_FOUND
    throw err
  }

  // FINAL FIELD TYPE
  const finalFieldType =
    FieldData.field_type || oldField.field_type

  const isListType =
    ['choice', 'multiChoice'].includes(finalFieldType)

  const incomingHasList = FieldData.list_json !== undefined

  // VALIDATE list_json
  if (incomingHasList && !isListType) {
    throw new Error(
      'لا يمكن تعديل list_json إلا إذا كان field_type = choice أو multiChoice'
    )
  }

  const typeChangedToList =
    FieldData.field_type &&
    isListType &&
    oldField.field_type !== FieldData.field_type

  if (typeChangedToList && !FieldData.list_json) {
    throw new Error(
      'يجب إرسال list_json عند تحويل النوع إلى choice أو multiChoice'
    )
  }

  // DEACTIVATE OLD VERSION
  await fieldRepository.updateInstance(oldField, {
    is_active: false
  })

  // CREATE NEW VERSION
  const newField = await fieldRepository.create({

    field_name:
      FieldData.field_name ?? oldField.field_name,

    field_type:
      finalFieldType,

    list_json: isListType
      ? (FieldData.list_json ?? oldField.list_json)
      : null,

    version: (oldField.version || 1) + 1,

    is_active:
      FieldData.is_active ?? true
  })

  return new FieldOutputDTO(newField)
}

/////============================== get all fields ==================================== :
async function getAllFieldsService() {
  const rows = await fieldRepository.findAllActive()
  return rows.map(row => new FieldOutputDTO(row))
}


// ======================================
// GET ONE ACTIVE
// =========================================
const getOneActiveFieldService = async id => {

  const field = await fieldRepository.findOneActiveById(id)

  if (!field) {
    throw new Error('هذا الحقل غير موجود')
  }

  return {
    message: 'تم جلب الحقل بنجاح',
    data: {
      success: true,
      field
    }
  }
}

module.exports = {
  createFieldService,
  updateFieldService,
  getAllFieldsService,
  getOneActiveFieldService
}
