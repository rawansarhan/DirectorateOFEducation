'use strict'

const radioGroupRepository = require('../repositories/radioGroupRepository')
const { RadioGroupInputDTO } = require('../dto/RadioGroupInputDTO')
const { validateCreateRadioGroup } = require('../validations/radioGroupValidations')
const { toDTO, toDTOList } = require('../mappers/radioGroupMapper')
const {
  getOrLoad,
  KEYS,
  invalidateRadioGroups
} = require('../../../../core/cache/apiCacheService')

const WIDGET_PREFIX = 'radio_group'
const LOG_PREFIX = '[RadioGroup]'

function formatValidationError (error) {
  return error.details.map(d => d.message).join(' | ')
}

function buildIdWidget (id) {
  return `${WIDGET_PREFIX}${id}`
}

async function createRadioGroupService (payload = {}) {
  const { error, value } = validateCreateRadioGroup(payload)

  if (error) {
    throw new Error(formatValidationError(error))
  }

  const input = new RadioGroupInputDTO(value)
  const pendingIdWidget = `__pending__${Date.now()}`

  const created = await radioGroupRepository.create({
    ...input,
    id_widget: pendingIdWidget
  })

  const updated = await radioGroupRepository.updateInstance(created, {
    id_widget: buildIdWidget(created.id)
  })

  console.log(
    `${LOG_PREFIX} POST /api/radio-groups — created id=${updated.id} — clearing list cache...`
  )
  await invalidateRadioGroups()

  return toDTO(updated)
}

async function loadAllRadioGroups () {
  const rows = await radioGroupRepository.findAllActive()
  return toDTOList(rows)
}

async function getAllRadioGroupsService () {
  console.log(
    `${LOG_PREFIX} GET /api/radio-groups — loading list (cache key: api:${KEYS.radioGroups()})`
  )

  return getOrLoad(
    KEYS.radioGroups(),
    loadAllRadioGroups,
    { label: 'RadioGroup GET /api/radio-groups' }
  )
}

async function getRadioGroupByIdService (id) {
  const numericId = Number(id)

  if (!Number.isInteger(numericId) || numericId < 1) {
    const err = new Error('معرّف مجموعة الاختيار غير صالح')
    err.statusCode = 400
    throw err
  }

  const row = await radioGroupRepository.findById(numericId)

  if (!row) {
    const err = new Error('مجموعة الاختيار غير موجودة')
    err.statusCode = 404
    throw err
  }

  return toDTO(row)
}

module.exports = {
  createRadioGroupService,
  getAllRadioGroupsService,
  getRadioGroupByIdService
}
