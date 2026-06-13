'use strict'

const filePickerRepository = require('../repositories/filePickerRepository')
const typeDocRepository = require('../../typeDoc/repositories/typeDocRepository')
const { FilePickerInputDTO } = require('../dto/FilePickerInputDTO')
const { validateCreateFilePicker } = require('../validations/filePickerValidations')
const { toDTO, toDTOList } = require('../mappers/filePickerMapper')
const {
  getOrLoad,
  KEYS,
  invalidateFilePickers
} = require('../../../../core/cache/apiCacheService')

const WIDGET_PREFIX = 'file_picker'
const LOG_PREFIX = '[FilePicker]'

function formatValidationError (error) {
  return error.details.map(d => d.message).join(' | ')
}

function buildIdWidget (id) {
  return `${WIDGET_PREFIX}${id}`
}

async function assertTypeDocExists (typeDocId) {
  const typeDoc = await typeDocRepository.findById(typeDocId)

  if (!typeDoc) {
    throw new Error('نوع الوثيقة (type_doc_id) غير موجود')
  }

  if (typeDoc.is_active === false) {
    throw new Error('نوع الوثيقة (type_doc_id) غير نشط')
  }

  return typeDoc
}

async function createFilePickerService (payload = {}) {
  const { error, value } = validateCreateFilePicker(payload)

  if (error) {
    throw new Error(formatValidationError(error))
  }

  await assertTypeDocExists(value.type_doc_id)

  const input = new FilePickerInputDTO(value)
  const pendingIdWidget = `__pending__${Date.now()}`

  const created = await filePickerRepository.create({
    ...input,
    id_widget: pendingIdWidget
  })

  const updated = await filePickerRepository.updateInstance(created, {
    id_widget: buildIdWidget(created.id)
  })

  console.log(
    `${LOG_PREFIX} POST /api/file-pickers — created id=${updated.id} — clearing list cache...`
  )
  await invalidateFilePickers()

  return toDTO(updated)
}

async function loadAllFilePickers () {
  const rows = await filePickerRepository.findAllActive()
  return toDTOList(rows)
}

async function getAllFilePickersService () {
  console.log(
    `${LOG_PREFIX} GET /api/file-pickers — loading list (cache key: api:${KEYS.filePickers()})`
  )

  return getOrLoad(
    KEYS.filePickers(),
    loadAllFilePickers,
    { label: 'FilePicker GET /api/file-pickers' }
  )
}

async function getFilePickerByIdService (id) {
  const numericId = Number(id)

  if (!Number.isInteger(numericId) || numericId < 1) {
    const err = new Error('معرّف منتقي الملفات غير صالح')
    err.statusCode = 400
    throw err
  }

  const row = await filePickerRepository.findById(numericId)

  if (!row) {
    const err = new Error('منتقي الملفات غير موجود')
    err.statusCode = 404
    throw err
  }

  return toDTO(row)
}

module.exports = {
  createFilePickerService,
  getAllFilePickersService,
  getFilePickerByIdService
}
