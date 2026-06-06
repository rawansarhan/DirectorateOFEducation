'use strict'

const datePickerRepository = require('../repositories/datePickerRepository')
const { DatePickerInputDTO } = require('../dto/DatePickerInputDTO')
const { validateCreateDatePicker } = require('../validations/datePickerValidations')
const { toDTO, toDTOList } = require('../mappers/datePickerMapper')
const {
  getOrLoad,
  KEYS,
  invalidateDatePickers
} = require('../../../../core/cache/apiCacheService')

const WIDGET_PREFIX = 'date_picker'
const LOG_PREFIX = '[DatePicker]'

function formatValidationError (error) {
  return error.details.map(d => d.message).join(' | ')
}

function buildIdWidget (id) {
  return `${WIDGET_PREFIX}${id}`
}

async function createDatePickerService (payload = {}) {
  const { error, value } = validateCreateDatePicker(payload)

  if (error) {
    throw new Error(formatValidationError(error))
  }

  const input = new DatePickerInputDTO(value)
  const pendingIdWidget = `__pending__${Date.now()}`

  const created = await datePickerRepository.create({
    ...input,
    id_widget: pendingIdWidget
  })

  const updated = await datePickerRepository.updateInstance(created, {
    id_widget: buildIdWidget(created.id)
  })

  console.log(
    `${LOG_PREFIX} POST /api/date-pickers — created id=${updated.id} — clearing list cache...`
  )
  await invalidateDatePickers()

  return toDTO(updated)
}

async function loadAllDatePickers () {
  const rows = await datePickerRepository.findAllActive()
  return toDTOList(rows)
}

async function getAllDatePickersService () {
  console.log(
    `${LOG_PREFIX} GET /api/date-pickers — loading list (cache key: api:${KEYS.datePickers()})`
  )

  return getOrLoad(
    KEYS.datePickers(),
    loadAllDatePickers,
    { label: 'DatePicker GET /api/date-pickers' }
  )
}

async function getDatePickerByIdService (id) {
  const numericId = Number(id)

  if (!Number.isInteger(numericId) || numericId < 1) {
    const err = new Error('معرّف منتقي التاريخ غير صالح')
    err.statusCode = 400
    throw err
  }

  const row = await datePickerRepository.findById(numericId)

  if (!row) {
    const err = new Error('منتقي التاريخ غير موجود')
    err.statusCode = 404
    throw err
  }

  return toDTO(row)
}

module.exports = {
  createDatePickerService,
  getAllDatePickersService,
  getDatePickerByIdService
}
