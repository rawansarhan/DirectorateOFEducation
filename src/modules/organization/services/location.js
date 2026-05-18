'use strict'

const locationRepository = require('../repositories/locationRepository')

async function getAllLocationsService() {
  return locationRepository.findAll()
}

module.exports = {
  getAllLocationsService
}
