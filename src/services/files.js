'use strict'

const {  ValidateCreateFile ,  ValidateUpdateFile} = require('../validations/filesValidations')
const { File } = require('../entities')
const { FileInputDTO} = require('../dto/FileInputDTO')
const { FileOutputDTO } = require('../dto/FileOutputDTO')

//// =========================================== create new File =========================== : 
async function createFileService (FileData) {

  try {
    const dataToValidate = { ...FileData }
    const { error } = ValidateCreateFile(dataToValidate)
    if (error) throw new Error(error.details[0].message)

    const inputFiledDTO = new FileInputDTO({
      ...FileData
    })

    const file = await File.create({
      ...inputFiledDTO
    })

    return new FileOutputDTO(file)
  } catch (err) {
    console.error('=== ERROR in createFileService ===')
    console.error(err)
    throw err
  }
}


//////=============================================  update File ============================== : 
async function updateFileService (FileData, FileId) {

  const id = parseInt(FileId, 10)
  if (!Number.isInteger(id) || id < 1) {
    throw new Error('معرّف الملف غير صالح')
  }

  const { error } = ValidateUpdateFile({ ...FileData })
  if (error) throw new Error(error.details[0].message)

  const file = await File.findByPk(id)
  if (!file) {
    const err = new Error('الملف غير موجودة')
    err.statusCode = 404
    throw err
  }

  const payload = {}
  if (FileData.file_name !== undefined) payload.file_name = FileData.file_name
  if (FileData.file_type !== undefined) payload.file_type = FileData.file_type
  if (FileData.type !== undefined) {
    payload.type = FileData.type
  }

  await file.update(payload)
  await file.reload()

  return new FileOutputDTO(file)
}

/////============================== get all Files ==================================== : 
async function getAllFilesService () {
  const rows = await File.findAll({
    order: [['id', 'ASC']]
  })
  return rows.map(row => new FileOutputDTO(row))
}



module.exports = {
  createFileService,
  updateFileService,
  getAllFilesService
}
