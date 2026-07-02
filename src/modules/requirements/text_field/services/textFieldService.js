'use strict'

const textFieldRepository = require('../repositories/textFieldRepository')
const { TextFieldInputDTO } = require('../dto/TextFieldInputDTO')
const { validateCreateTextField } = require('../validations/textFieldValidations')
const { toDTO, toDTOList } = require('../mappers/textFieldMapper')
const {
  invalidateTextFields
} = require('../../../../core/cache/apiCacheService')
const {
  parsePaginationQuery,
  buildPaginationMeta
} = require('../../../../core/utils/pagination')

const WIDGET_PREFIX = 'text_field'
const LOG_PREFIX = '[TextField]'

function formatValidationError (error) {
  return error.details.map(d => d.message).join(' | ')
}

function buildIdWidget (id) {
  return `${WIDGET_PREFIX}${id}`
}

async function createTextFieldService (payload = {}) {
  const { error, value } = validateCreateTextField(payload)

  if (error) {
    throw new Error(formatValidationError(error))
  }

  const input = new TextFieldInputDTO(value)
  const pendingIdWidget = `__pending__${Date.now()}`

  const created = await textFieldRepository.create({
    ...input,
    id_widget: pendingIdWidget
  })

  const updated = await textFieldRepository.updateInstance(created, {
    id_widget: buildIdWidget(created.id)
  })

  console.log(
    `${LOG_PREFIX} POST /api/text-fields — created id=${updated.id} — clearing list cache...`
  )
  await invalidateTextFields()

  return toDTO(updated)
}

async function loadAllTextFields () {
  const rows = await textFieldRepository.findAllActive()
  return toDTOList(rows)
}

async function getAllTextFieldsService (query = {}) {
  const { page, limit, offset } = parsePaginationQuery(query, {
    defaultLimit: 10
  })
  const search = String(query.search || '').trim()

  console.log(
    `${LOG_PREFIX} GET /api/text-fields — page=${page} limit=${limit}` +
    (search ? ` search="${search}"` : '')
  )

  const { rows, count } = await textFieldRepository.findAndCountActive({
    limit,
    offset,
    search: search || undefined
  })

  return {
    items: toDTOList(rows),
    pagination: buildPaginationMeta({ page, limit, total: count })
  }
}

async function getTextFieldByIdService (id) {
  const numericId = Number(id)

  if (!Number.isInteger(numericId) || numericId < 1) {
    const err = new Error('معرّف الحقل غير صالح')
    err.statusCode = 400
    throw err
  }

  const row = await textFieldRepository.findById(numericId)

  if (!row) {
    const err = new Error('حقل النص غير موجود')
    err.statusCode = 404
    throw err
  }

  return toDTO(row)
}

module.exports = {
  createTextFieldService,
  getAllTextFieldsService,
  getTextFieldByIdService
}
