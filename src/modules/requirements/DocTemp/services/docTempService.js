'use strict'

const documentTemplateRepository = require('../repositories/documentTemplateRepository')
const { DocumentTemplateInputDTO } = require('../dto/DocumentTemplateInputDTO')
const { toDTO, toDTOList } = require('../mappers/documentTemplateMapper')
const {
  createDocumentTemplateValidation,
  updateDocumentTemplateValidation
} = require('../validations/docTempValidations')

function formatValidationError (error) {
  return error.details.map(d => d.message).join(' | ')
}

async function createDocumentTemplateService (data) {
  const { error } = createDocumentTemplateValidation(data)

  if (error) {
    throw new Error(formatValidationError(error))
  }

  if (!data.file_path) {
    throw new Error('file is required')
  }

  const input = new DocumentTemplateInputDTO({
    name: data.name,
    file_path: data.file_path,
    file_type: data.file_type,
    config_json: data.config_json || null
  })

  const documentTemplate = await documentTemplateRepository.create({ ...input })

  return toDTO(documentTemplate)
}

async function updateDocumentTemplateService (id, data) {
  const { error } = updateDocumentTemplateValidation(data)

  if (error) {
    throw new Error(formatValidationError(error))
  }

  const oldTemplate = await documentTemplateRepository.findById(id)

  if (!oldTemplate) {
    throw new Error('Document template not found')
  }

  await documentTemplateRepository.updateInstance(oldTemplate, {
    is_active: false,
    is_latest: false
  })

  const input = new DocumentTemplateInputDTO({
    name: data.name ?? oldTemplate.name,
    file_path: data.file_path ?? oldTemplate.file_path,
    file_type: data.file_type ?? oldTemplate.file_type,
    engine_type: data.engine_type ?? oldTemplate.engine_type,
    config_json: data.config_json ?? oldTemplate.config_json,
    version: (oldTemplate.version || 1) + 1,
    is_latest: true,
    is_active: data.is_active ?? true
  })

  const newTemplate = await documentTemplateRepository.create({ ...input })

  return toDTO(newTemplate)
}

async function getAllActiveDocumentTemplatesService () {
  const templates = await documentTemplateRepository.findAllActive()
  return toDTOList(templates)
}

async function getOneActiveDocumentTemplateService (id) {
  const template = await documentTemplateRepository.findOneActiveById(id)

  if (!template) {
    const err = new Error('Document template not found')
    err.statusCode = 404
    throw err
  }

  return toDTO(template)
}

module.exports = {
  createDocumentTemplateService,
  updateDocumentTemplateService,
  getAllActiveDocumentTemplatesService,
  getOneActiveDocumentTemplateService
}
