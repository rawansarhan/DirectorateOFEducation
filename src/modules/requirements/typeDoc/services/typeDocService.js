'use strict'

const typeDocRepository = require('../repositories/typeDocRepository')
const typeDocMapper = require('../mappers/typeDocMapper')
const {
  validateCreateTypeDoc,
  validateUpdateTypeDoc
} = require('../validations/typeDocValidation')
const { retryWithBackoff } = require('../../../../core/utils/retryWithBackoff')
const {
  getOrLoad,
  KEYS,
  invalidateTypeDocs
} = require('../../../../core/cache/apiCacheService')
const {
  parsePaginationQuery,
  buildPaginationMeta
} = require('../../../../core/utils/pagination')

function createTypeDocError (code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

function formatValidationError (error) {
  return error.details.map(d => d.message).join(' | ')
}

async function createTypeDocService (data) {
  const { error, value } = validateCreateTypeDoc(data)

  if (error) {
    throw createTypeDocError('VALIDATION_ERROR', formatValidationError(error))
  }

  const existing = await retryWithBackoff(
    () => typeDocRepository.findByName(value.name),
    { label: 'typeDoc.findByName' }
  )

  if (existing) {
    throw createTypeDocError(
      'DUPLICATE_NAME',
      `نوع الوثيقة "${value.name}" موجود مسبقاً`
    )
  }

  const row = await retryWithBackoff(
    () => typeDocRepository.create({ name: value.name, is_active: true }),
    { label: 'typeDoc.create' }
  )

  await invalidateTypeDocs()

  return typeDocMapper.toDTO(row)
}

async function updateTypeDocService (id, data) {
  const typeDocId = parseInt(id, 10)

  if (!Number.isInteger(typeDocId) || typeDocId < 1) {
    throw createTypeDocError('VALIDATION_ERROR', 'معرّف نوع الوثيقة غير صالح')
  }

  const { error, value } = validateUpdateTypeDoc(data)

  if (error) {
    throw createTypeDocError('VALIDATION_ERROR', formatValidationError(error))
  }

  const row = await retryWithBackoff(
    () => typeDocRepository.findById(typeDocId),
    { label: 'typeDoc.findById' }
  )

  if (!row) {
    throw createTypeDocError('TYPE_DOC_NOT_FOUND', 'نوع الوثيقة غير موجود')
  }

  if (value.name && value.name !== row.name) {
    const duplicate = await retryWithBackoff(
      () => typeDocRepository.findByName(value.name),
      { label: 'typeDoc.findByName' }
    )

    if (duplicate) {
      throw createTypeDocError(
        'DUPLICATE_NAME',
        `نوع الوثيقة "${value.name}" موجود مسبقاً`
      )
    }
  }

  const updated = await retryWithBackoff(
    () => typeDocRepository.update(row, value),
    { label: 'typeDoc.update' }
  )

  await invalidateTypeDocs()

  return typeDocMapper.toDTO(updated)
}

async function loadAllTypeDocs () {
  const rows = await retryWithBackoff(
    () => typeDocRepository.findAllActive(),
    { label: 'typeDoc.findAllActive' }
  )

  return rows.map(typeDocMapper.toDTO)
}

async function getAllTypeDocsService (query = {}) {
  const { page, limit, offset } = parsePaginationQuery(query, {
    defaultLimit: 10
  })
  const search = String(query.search || '').trim()

  const { rows, count } = await retryWithBackoff(
    () => typeDocRepository.findAndCountActive({
      limit,
      offset,
      search: search || undefined
    }),
    { label: 'typeDoc.findAndCountActive' }
  )

  return {
    items: rows.map(typeDocMapper.toDTO),
    pagination: buildPaginationMeta({ page, limit, total: count })
  }
}

async function getTypeDocByIdService (id) {
  const typeDocId = parseInt(id, 10)

  if (!Number.isInteger(typeDocId) || typeDocId < 1) {
    throw createTypeDocError('VALIDATION_ERROR', 'معرّف نوع الوثيقة غير صالح')
  }

  return getOrLoad(KEYS.typeDocById(typeDocId), async () => {
    const row = await retryWithBackoff(
      () => typeDocRepository.findById(typeDocId),
      { label: `typeDoc.findById:${typeDocId}` }
    )

    if (!row) {
      throw createTypeDocError('TYPE_DOC_NOT_FOUND', 'نوع الوثيقة غير موجود')
    }

    return typeDocMapper.toDTO(row)
  }, { label: `TypeDoc GET /api/typeDoc/${typeDocId}` })
}

async function findOrCreateTypeDocByName (name) {
  const trimmed = String(name || '').trim()

  if (!trimmed) {
    throw createTypeDocError('VALIDATION_ERROR', 'اسم نوع الوثيقة مطلوب')
  }

  const existing = await retryWithBackoff(
    () => typeDocRepository.findByName(trimmed),
    { label: `typeDoc.findByName:${trimmed}` }
  )

  if (existing) {
    return existing
  }

  const row = await retryWithBackoff(
    () => typeDocRepository.create({ name: trimmed, is_active: true }),
    { label: `typeDoc.create:${trimmed}` }
  )

  await invalidateTypeDocs()

  return row
}

module.exports = {
  createTypeDocService,
  updateTypeDocService,
  getAllTypeDocsService,
  getTypeDocByIdService,
  findOrCreateTypeDocByName
}
