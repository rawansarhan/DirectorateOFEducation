'use strict'

const { ValidateCreateLocation } = require('../validations/locationValidation')
const locationRepository = require('../repositories/locationRepository')
const {
  toCreateInput,
  toCreatePayload,
  toDTO,
  toDTOList
} = require('../mappers/locationMapper')
const {
  getOrLoad,
  KEYS,
  invalidateLocations
} = require('../../../../core/cache/apiCacheService')

function formatValidationError (error) {
  return error.details.map(d => d.message).join(' | ')
}

// ================= CREATE =================
async function createLocationService (data) {
  const { error, value } = ValidateCreateLocation(data)

  if (error) {
    const err = new Error(formatValidationError(error))
    err.statusCode = 400
    throw err
  }

  const input = toCreateInput(value)

  const typeLocation = await locationRepository.findTypeLocationById(input.typeLocation_id)
  if (!typeLocation) {
    const err = new Error('نوع الموقع غير موجود')
    err.statusCode = 404
    throw err
  }

  if (input.parent_id) {
    const parent = await locationRepository.findById(input.parent_id)
    if (!parent) {
      const err = new Error('الموقع الأب غير موجود')
      err.statusCode = 404
      throw err
    }
  }

  const created = await locationRepository.create(toCreatePayload(input))

  await invalidateLocations()

  const withRelations = await locationRepository.findByIdWithRelations(created.id)
  return toDTO(withRelations)
}

// ================= GET ALL =================
async function getAllLocationsService () {
  return getOrLoad(
    KEYS.locations(),
    async () => toDTOList(await locationRepository.findAll()),
    { label: 'Location GET /api/location' }
  )
}

module.exports = {
  createLocationService,
  getAllLocationsService
}
