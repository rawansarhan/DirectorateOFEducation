const {
  DocumentTemplate
} = require('../../../entities')

const {
  createDocumentTemplateValidation,
  updateDocumentTemplateValidation
} = require('../validations/DocTemValidations')

// =========================================
// CREATE
// =========================================
const createDocumentTemplateService = async data => {

  const { error } =
    createDocumentTemplateValidation(data)

  if (error) {
    throw new Error(error.details[0].message)
  }

  if (!data.file_path) {
    throw new Error('file is required')
  }

  const documentTemplate =
    await DocumentTemplate.create({

      name: data.name,
      file_path: data.file_path,
      file_type: data.file_type,
      engine_type:'ACROFORM',
      config_json: data.config_json || null,

      // 🔥 server-controlled fields
      version: 1,
      is_active: true,
      is_latest: true
    })

  return {
    message: 'تم إنشاء القالب بنجاح',
    data: {
      success: true,
      document_template: documentTemplate
    }
  }
}

// =========================================
// UPDATE
// =========================================
const updateDocumentTemplateService = async (
  id,
  data
) => {

  // =========================================
  // VALIDATION
  // =========================================
  const { error } =
    updateDocumentTemplateValidation(data)

  if (error) {
    throw new Error(error.details[0].message)
  }

  // =========================================
  // GET CURRENT TEMPLATE
  // =========================================
  const oldTemplate =
    await DocumentTemplate.findByPk(id)

  if (!oldTemplate) {
    throw new Error('Document template not found')
  }

  // =========================================
  // DEACTIVATE OLD VERSION
  // =========================================
  await oldTemplate.update({
    is_active: false,
    is_latest: false
  })

  // =========================================
  // CREATE NEW VERSION
  // =========================================
  const newTemplate =
    await DocumentTemplate.create({

      name:
        data.name ?? oldTemplate.name,

      file_path:
        data.file_path ??
        oldTemplate.file_path,

      file_type:
        data.file_type ??
        oldTemplate.file_type,

      engine_type:
        data.engine_type ??
        oldTemplate.engine_type,

      config_json:
        data.config_json ??
        oldTemplate.config_json,

      // 🔥 زيادة النسخة
      version:
        (oldTemplate.version || 1) + 1,

      // النسخة الجديدة هي الأحدث
      is_latest: true,

      // النسخة الجديدة فعالة
      is_active:
        data.is_active ?? true
    })

  return {
    message: 'تم تعديل القالب بنجاح',
    data: {
      success: true,
      document_template: newTemplate
    }
  }
}

// =========================================
// GET ACTIVE ONLY
// =========================================
const getAllActiveDocumentTemplatesService = async () => {

  const templates =
    await DocumentTemplate.findAll({
      where: {
        is_active: true

    },
      order: [['id', 'DESC']]
    })

  return {
    message: 'تم جلب القوالب بنجاح',
    data: {
      success: true,
      templates
    }
  }
}

// ======================================
// GET ONE ACTIVE
// =========================================
const getOneActiveDocumentTemplateService = async id => {

  const template =
    await DocumentTemplate.findOne({
      where: {
        id,
        is_active: true
      }
    })

  if (!template) {
    throw new Error('Document template not found')
  }

  return {
    message: 'تم جلب القالب بنجاح',
    data: {
      success: true,
      template
    }
  }
}
module.exports = {
  createDocumentTemplateService,
  updateDocumentTemplateService,
  getAllActiveDocumentTemplatesService,
  getOneActiveDocumentTemplateService
}