const documentTemplateRepository = require('../repositories/documentTemplateRepository')

const {
  getOrLoad,
  KEYS,
  invalidateDocumentTemplates
} = require('../../../core/cache/apiCacheService')

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
    await documentTemplateRepository.create({

      name: data.name,
      file_path: data.file_path,
      file_type: data.file_type,
      engine_type: 'ACROFORM',
      config_json: data.config_json || null,

      version: 1,
      is_active: true,
      is_latest: true
    })

  await invalidateDocumentTemplates()

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

  const { error } =
    updateDocumentTemplateValidation(data)

  if (error) {
    throw new Error(error.details[0].message)
  }

  const oldTemplate =
    await documentTemplateRepository.findById(id)

  if (!oldTemplate) {
    throw new Error('Document template not found')
  }

  await documentTemplateRepository.updateInstance(oldTemplate, {
    is_active: false,
    is_latest: false
  })

  const newTemplate =
    await documentTemplateRepository.create({

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

      version:
        (oldTemplate.version || 1) + 1,

      is_latest: true,

      is_active:
        data.is_active ?? true
    })

  await invalidateDocumentTemplates()

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
  return getOrLoad(
    KEYS.documentTemplates(),
    async () => {
      const templates = await documentTemplateRepository.findAllActive()

      return {
        message: 'تم جلب القوالب بنجاح',
        data: {
          success: true,
          templates
        }
      }
    },
    { label: 'GET /api/document-templates' }
  )
}

// ======================================
// GET ONE ACTIVE
// =========================================
const getOneActiveDocumentTemplateService = async id => {

  const template = await documentTemplateRepository.findOneActiveById(id)

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
