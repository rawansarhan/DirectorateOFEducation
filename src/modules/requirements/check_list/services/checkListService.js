'use strict'

const checkListRepository = require('../repositories/checkListRepository')
const { CheckListInputDTO } = require('../dto/CheckListInputDTO')
const { validateCreateCheckList } = require('../validations/checkListValidations')
const { toDTO, toDTOList } = require('../mappers/checkListMapper')
const {
  getOrLoad,
  KEYS,
  invalidateCheckLists
} = require('../../../../core/cache/apiCacheService')

const WIDGET_PREFIX = 'check_list'
const LOG_PREFIX = '[CheckList]'

function formatValidationError (error) {
  return error.details.map(d => d.message).join(' | ')
}

function buildIdWidget (id) {
  return `${WIDGET_PREFIX}${id}`
}

async function createCheckListService (payload = {}) {
  const { error, value } = validateCreateCheckList(payload)

  if (error) {
    throw new Error(formatValidationError(error))
  }

  const input = new CheckListInputDTO(value)
  const pendingIdWidget = `__pending__${Date.now()}`

  const created = await checkListRepository.create({
    ...input,
    id_widget: pendingIdWidget
  })

  const updated = await checkListRepository.updateInstance(created, {
    id_widget: buildIdWidget(created.id)
  })

  console.log(
    `${LOG_PREFIX} POST /api/check-lists — created id=${updated.id} — clearing list cache...`
  )
  await invalidateCheckLists()

  return toDTO(updated)
}

async function loadAllCheckLists () {
  const rows = await checkListRepository.findAllActive()
  return toDTOList(rows)
}

async function getAllCheckListsService () {
  console.log(
    `${LOG_PREFIX} GET /api/check-lists — loading list (cache key: api:${KEYS.checkLists()})`
  )

  return getOrLoad(
    KEYS.checkLists(),
    loadAllCheckLists,
    { label: 'CheckList GET /api/check-lists' }
  )
}

async function getCheckListByIdService (id) {
  const numericId = Number(id)

  if (!Number.isInteger(numericId) || numericId < 1) {
    const err = new Error('معرّف قائمة الاختيار غير صالح')
    err.statusCode = 400
    throw err
  }

  const row = await checkListRepository.findById(numericId)

  if (!row) {
    const err = new Error('قائمة الاختيار غير موجودة')
    err.statusCode = 404
    throw err
  }

  return toDTO(row)
}

module.exports = {
  createCheckListService,
  getAllCheckListsService,
  getCheckListByIdService
}
