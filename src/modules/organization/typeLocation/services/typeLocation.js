'use strict'

const { ValidateCreateTypeLocation } = require('../validations/typeLocationValidation')
const typeLocationRepository = require('../repositories/typeLocationRepository')
const {
  toCreateInput,
  toCreatePayload,
  toDTO,
  toDTOList
} = require('../mappers/typeLocationMapper')
const {
  getOrLoad,
  KEYS,
  invalidateTypeLocations
} = require('../../../../core/cache/apiCacheService')

function formatValidationError (error) {
  return error.details.map(d => d.message).join(' | ')
}

// ================= CREATE =================
async function createTypeLocationService (data) {
  const { error, value } = ValidateCreateTypeLocation(data)

  if (error) {
    const err = new Error(formatValidationError(error))
    err.statusCode = 400
    throw err
  }

  const input = toCreateInput(value)

  // الاسم هو كل ما يميّز النوع، فالتكرار يُنتج خيارين متطابقين في القوائم.
  const existing = await typeLocationRepository.findByName(input.name)
  if (existing) {
    const err = new Error('نوع الموقع موجود مسبقاً')
    err.statusCode = 409
    throw err
  }

  const created = await typeLocationRepository.create(toCreatePayload(input))

  await invalidateTypeLocations()

  return toDTO(created)
}

// ================= GET ALL =================
async function getAllTypeLocationsService () {
  return getOrLoad(
    KEYS.typeLocations(),
    async () => toDTOList(await typeLocationRepository.findAll()),
    { label: 'TypeLocation GET /api/type-location' }
  )
}

module.exports = {
  createTypeLocationService,
  getAllTypeLocationsService
}
