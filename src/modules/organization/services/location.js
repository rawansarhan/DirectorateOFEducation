'use strict'

const locationRepository = require('../repositories/locationRepository')
const {
  getOrLoad,
  KEYS
} = require('../../../core/cache/apiCacheService')

async function getAllLocationsService() {
  return getOrLoad(
    KEYS.locations(),
    () => locationRepository.findAll(),
    { label: 'GET /api/location/' }
  )
}

module.exports = {
  getAllLocationsService
}
