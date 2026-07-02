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
const fs = require('fs')
const { toPublicFileUrl } = require('../../../../core/utils/filePath')
const {
  extractPdfAcroFormFieldsFromBytes,
  extractPdfAcroFormFieldsFromPath
} = require('../../../transaction/document/services/pdfGenerationService')

function mapFieldsForExtractResponse (fields = []) {
  return fields.map(({ id, pdf_field_type, widget_type }) => ({
    id,
    pdf_field_type,
    widget_type
  }))
}

function buildStoredUploadPath (file) {
  return file?.filename ? `/uploads/${file.filename}` : null
}

function buildExtractFieldsResponse (fields = [], { source = 'upload', file = null, storedPath = null } = {}) {
  const normalizedFields = mapFieldsForExtractResponse(fields)
  const path = storedPath || buildStoredUploadPath(file)
  const url = path ? toPublicFileUrl(path) : null

  return {
    source,
    engine_type: 'ACROFORM',
    field_count: normalizedFields.length,
    fields: normalizedFields,
    path,
    url
  }
}

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
    name: data.name,
    type_doc_id: normalizeTypeDocId(data),
    path: data.path ?? null,
    url: data.url ?? null,
    config_json: data.config_json ?? null
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
  const { error, value } = updateDocumentTemplateValidation(data)

  if (error) {
    throw createDocTempError('VALIDATION_ERROR', formatValidationError(error))
  }

  const oldTemplate = await documentTemplateRepository.findById(id)

  if (!oldTemplate) {
    throw createDocTempError('TEMPLATE_NOT_FOUND', 'قالب الوثيقة غير موجود')
  }

  await documentTemplateRepository.updateInstance(oldTemplate, {
    is_active: false,
    is_latest: false
  })

  const input = new DocumentTemplateInputDTO({
    name: oldTemplate.name,
    file_path: oldTemplate.file_path,
    type_doc_id: oldTemplate.type_doc_id,
    engine_type: oldTemplate.engine_type,
    config_json: value.config_json,
    version: (oldTemplate.version || 1) + 1,
    is_latest: true,
    is_active: true
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

async function extractTemplateFieldsFromUploadService (file) {
  if (!file?.path) {
    throw createDocTempError('FILE_REQUIRED', 'ملف PDF مطلوب')
  }

  const templateBytes = fs.readFileSync(file.path)
  const fields = await extractPdfAcroFormFieldsFromBytes(templateBytes)

  return buildExtractFieldsResponse(fields, { source: 'upload', file })
}

async function extractTemplateFieldsByIdService (id) {
  const template = await documentTemplateRepository.findOneActiveById(id)

  if (!template) {
    throw createDocTempError('TEMPLATE_NOT_FOUND', 'قالب الوثيقة غير موجود')
  }

  if (!template.file_path) {
    throw createDocTempError('FILE_REQUIRED', 'قالب الوثيقة لا يحتوي ملف PDF')
  }

  const fields = await extractPdfAcroFormFieldsFromPath(template.file_path)

  return buildExtractFieldsResponse(fields, {
    source: 'template',
    storedPath: template.file_path
  })
}

module.exports = {
  createDocumentTemplateService,
  updateDocumentTemplateService,
  getAllActiveDocumentTemplatesService,
  getOneActiveDocumentTemplateService,
  extractTemplateFieldsFromUploadService,
  extractTemplateFieldsByIdService
}
