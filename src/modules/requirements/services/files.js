'use strict'

const {  ValidateCreateFile ,  ValidateUpdateFile} = require('../validations/filesValidations')
const { File } = require('../../../entities')
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
async function updateFileService(FileData, FileId) {

  const id = parseInt(FileId, 10)

  if (!Number.isInteger(id) || id < 1) {
    throw new Error('معرّف الملف غير صالح')
  }

  // =========================================
  // VALIDATION
  // =========================================
  const { error } = ValidateUpdateFile({
    ...FileData
  })

  if (error) {
    throw new Error(error.details[0].message)
  }

  // =========================================
  // GET CURRENT FILE
  // =========================================
  const oldFile = await File.findByPk(id)

  if (!oldFile) {
    const err = new Error('الملف غير موجودة')
    err.statusCode = 404
    throw err
  }

  // =========================================
  // DEACTIVATE OLD VERSION
  // =========================================
  await oldFile.update({
    is_active: false
  })

  // =========================================
  // CREATE NEW VERSION
  // =========================================
  const newFile = await File.create({

    file_name:
      FileData.file_name ?? oldFile.file_name,

    file_type:
      FileData.file_type ?? oldFile.file_type,

    type:
      FileData.type ?? oldFile.type,

    // 🔥 زيادة النسخة
    version: oldFile.version + 1,

    // النسخة الجديدة فعالة
    is_active:
      FileData.is_active ?? true
  })

  // =========================================
  // RETURN DTO
  // =========================================
  return new FileOutputDTO(newFile)
}

/////============================== get all Files ==================================== : 
async function getAllFilesService () {
  const rows = await File.findAll({
        is_active: true,

    order: [['id', 'ASC']]
  })
  return rows.map(row => new FileOutputDTO(row))
}


// ======================================
// GET ONE ACTIVE
// =========================================
const getOneActiveFileService = async id => {

  const file =
    await File.findOne({
      where: {
        id,
        is_active: true
      }
    })

  if (!file) {
    throw new Error('هذا ملف غير موجود')
  }

  return {
    message: 'تم جلب ملف بنجاح',
    data: {
      success: true,
      file
    }
  }
}


module.exports = {
  createFileService,
  updateFileService,
  getAllFilesService,
  getOneActiveFileService
}
