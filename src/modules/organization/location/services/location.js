'use strict'

const { ValidateCreateLocation } = require('../validations/locationValidation')
const locationRepository = require('../repositories/locationRepository')
const {
  getOrLoad,
  KEYS,
  invalidateLocations
} = require('../../../../core/cache/apiCacheService')

// ================= CREATE =================
async function createLocationService(data) {
  const { error } = ValidateCreateLocation(data)

  if (error) {
    const msg = error.details.map(d => d.message).join(' | ')
    const err = new Error(msg)
    err.statusCode = 400
    throw err
  }

  const typeLocation = await locationRepository.findTypeLocationById(data.typeLocation_id)
  if (!typeLocation) {
    const err = new Error('نوع الموقع غير موجود')
    err.statusCode = 404
    throw err
  }

  if (data.parent_id) {
    const parent = await locationRepository.findById(data.parent_id)
    if (!parent) {
      const err = new Error('الموقع الأب غير موجود')
      err.statusCode = 404
      throw err
    }
  }

  const created = await locationRepository.create({
    name: data.name,
    typeLocation_id: data.typeLocation_id,
    parent_id: data.parent_id ?? null
  })

  await invalidateLocations()

  return locationRepository.findByIdWithRelations(created.id)
}

// ================= GET ALL =================
async function getAllLocationsService() {
  return getOrLoad(
    KEYS.locations(),
    () => locationRepository.findAll(),
    { label: 'Location GET /api/location' }
  )
}

module.exports = {
  createLocationService,
  getAllLocationsService
}
