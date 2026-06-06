'use strict'

const textDropdownRepository = require('../repositories/textDropdownRepository')
const { TextDropdownInputDTO } = require('../dto/TextDropdownInputDTO')
const { validateCreateTextDropdown } = require('../validations/textDropdownValidations')
const { toDTO, toDTOList } = require('../mappers/textDropdownMapper')
const {
  getOrLoad,
  KEYS,
  invalidateTextDropdowns
} = require('../../../../core/cache/apiCacheService')

const WIDGET_PREFIX = 'dropdown'
const LOG_PREFIX = '[TextDropdown]'

function formatValidationError (error) {
  return error.details.map(d => d.message).join(' | ')
}

function buildIdWidget (id) {
  return `${WIDGET_PREFIX}${id}`
}

async function createTextDropdownService (payload = {}) {
  const { error, value } = validateCreateTextDropdown(payload)

  if (error) {
    throw new Error(formatValidationError(error))
  }

  const input = new TextDropdownInputDTO(value)
  const pendingIdWidget = `__pending__${Date.now()}`

  const created = await textDropdownRepository.create({
    ...input,
    id_widget: pendingIdWidget
  })

  const idWidget = buildIdWidget(created.id)
  const updated = await textDropdownRepository.updateInstance(created, {
    id_widget: idWidget
  })

  console.log(
    `${LOG_PREFIX} POST /api/text-dropdowns — created id=${updated.id} — clearing list cache...`
  )
  await invalidateTextDropdowns()

  return toDTO(updated)
}

async function loadAllTextDropdowns () {
  const rows = await textDropdownRepository.findAllActive()
  return toDTOList(rows)
}

async function getAllTextDropdownsService () {
  console.log(
    `${LOG_PREFIX} GET /api/text-dropdowns — loading list (cache key: api:${KEYS.textDropdowns()})`
  )

  return getOrLoad(
    KEYS.textDropdowns(),
    loadAllTextDropdowns,
    { label: 'TextDropdown GET /api/text-dropdowns' }
  )
}

async function getTextDropdownByIdService (id) {
  const numericId = Number(id)

  if (!Number.isInteger(numericId) || numericId < 1) {
    const err = new Error('معرّف القائمة المنسدلة غير صالح')
    err.statusCode = 400
    throw err
  }

  const row = await textDropdownRepository.findById(numericId)

  if (!row) {
    const err = new Error('القائمة المنسدلة غير موجودة')
    err.statusCode = 404
    throw err
  }

  return toDTO(row)
}

module.exports = {
  createTextDropdownService,
  getAllTextDropdownsService,
  getTextDropdownByIdService
}
