'use strict'

const documentTemplateRepository = require('../repositories/documentTemplateRepository')
const typeDocRepository = require('../../typeDoc/repositories/typeDocRepository')
const { DocumentTemplateInputDTO } = require('../dto/DocumentTemplateInputDTO')
const { toDTO, toDTOList } = require('../mappers/documentTemplateMapper')
const {
  createDocumentTemplateValidation,
  updateDocumentTemplateValidation,
  formatValidationError
} = require('../validations/docTempValidations')
const { invalidateDocumentTemplates } = require('../../../../core/cache/apiCacheService')

function createDocTempError (code, message) {
  const err = new Error(message)
  err.code = code
  return err
}

function normalizeTypeDocId (data = {}) {
  const raw = data.type_doc_id ?? data.TypeDoc_id

  if (raw == null || raw === '') {
    return null
  }

  const parsed = Number(raw)

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function normalizeCreatePayload (data = {}) {
  return {
    ...data,
    type_doc_id: normalizeTypeDocId(data),
    file_path: data.file_path || null
  }
}

async function assertTypeDocExists (typeDocId) {
  const typeDoc = await typeDocRepository.findById(typeDocId)

  if (!typeDoc) {
    throw createDocTempError(
      'TYPE_DOC_NOT_FOUND',
      'نوع الوثيقة (type_doc_id) غير موجود'
    )
  }

  if (typeDoc.is_active === false) {
    throw createDocTempError(
      'TYPE_DOC_INACTIVE',
      'نوع الوثيقة (type_doc_id) غير نشط'
    )
  }

  return typeDoc
}

async function createDocumentTemplateService (data) {
  const payload = normalizeCreatePayload(data)

  const { error, value } = createDocumentTemplateValidation(payload)

  if (error) {
    throw createDocTempError('VALIDATION_ERROR', formatValidationError(error))
  }

  if (!value.file_path) {
    throw createDocTempError('FILE_REQUIRED', 'ملف القالب مطلوب')
  }

  await assertTypeDocExists(value.type_doc_id)

  const input = new DocumentTemplateInputDTO({
    name: value.name,
    file_path: value.file_path,
    type_doc_id: value.type_doc_id,
    config_json: value.config_json
  })

  const documentTemplate = await documentTemplateRepository.create({ ...input })

  await invalidateDocumentTemplates()

  const created = await documentTemplateRepository.findOneActiveById(documentTemplate.id)

  return toDTO(created || documentTemplate)
}

async function updateDocumentTemplateService (id, data) {
  const payload = normalizeCreatePayload(data)

  const { error, value } = updateDocumentTemplateValidation(payload)

  if (error) {
    throw createDocTempError('VALIDATION_ERROR', formatValidationError(error))
  }

  const oldTemplate = await documentTemplateRepository.findById(id)

  if (!oldTemplate) {
    throw createDocTempError('TEMPLATE_NOT_FOUND', 'قالب الوثيقة غير موجود')
  }

  if (value.type_doc_id != null) {
    await assertTypeDocExists(value.type_doc_id)
  }

  await documentTemplateRepository.updateInstance(oldTemplate, {
    is_active: false,
    is_latest: false
  })

  const input = new DocumentTemplateInputDTO({
    name: value.name ?? oldTemplate.name,
    file_path: value.file_path ?? oldTemplate.file_path,
    type_doc_id: value.type_doc_id ?? oldTemplate.type_doc_id,
    engine_type: value.engine_type ?? oldTemplate.engine_type,
    config_json: value.config_json ?? oldTemplate.config_json,
    version: (oldTemplate.version || 1) + 1,
    is_latest: true,
    is_active: value.is_active ?? true
  })

  const newTemplate = await documentTemplateRepository.create({ ...input })

  await invalidateDocumentTemplates()

  const created = await documentTemplateRepository.findOneActiveById(newTemplate.id)

  return toDTO(created || newTemplate)
}

async function getAllActiveDocumentTemplatesService () {
  const templates = await documentTemplateRepository.findAllActive()
  return toDTOList(templates)
}

async function getOneActiveDocumentTemplateService (id) {
  const template = await documentTemplateRepository.findOneActiveById(id)

  if (!template) {
    throw createDocTempError('TEMPLATE_NOT_FOUND', 'قالب الوثيقة غير موجود')
  }

  return toDTO(template)
}

module.exports = {
  createDocumentTemplateService,
  updateDocumentTemplateService,
  getAllActiveDocumentTemplatesService,
  getOneActiveDocumentTemplateService
}
