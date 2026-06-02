'use strict'

const { HTTP_STATUS } = require('../../../core/middleware/httpStatusCodes')

const {
  ValidateCreateOrganization,
  ValidateUpdateOrganization
} = require('../validations/organizationValidation')

const organizationRepository = require('../repositories/organizationRepository')
const locationRepository = require('../repositories/locationRepository')
const {
  getOrLoad,
  KEYS,
  invalidateOrganizations
} = require('../../../core/cache/apiCacheService')

// ================= CREATE =================
async function createOrganizationService(data) {
  const { error } = ValidateCreateOrganization(data)

  if (error) {
    const msg = error.details.map(d => d.message).join(' | ')
    const err = new Error(msg)
    err.statusCode = HTTP_STATUS.BAD_REQUEST
    throw err
  }

  if (data.parent_id) {
    const parent = await organizationRepository.findById(data.parent_id)
    if (!parent) {
      const err = new Error('المؤسسة الأب غير موجودة')
      err.statusCode = HTTP_STATUS.NOT_FOUND
      throw err
    }
  }

  if (data.location_id) {
    const location = await locationRepository.findById(data.location_id)
    if (!location) {
      const err = new Error('الموقع غير موجود')
      err.statusCode = HTTP_STATUS.NOT_FOUND
      throw err
    }
  }

  const organization = await organizationRepository.create({
    name: data.name,
    parent_id: data.parent_id ?? null,
    location_id: data.location_id ?? null
  })

  await invalidateOrganizations()

  return organization
}

// ================= UPDATE =================
async function updateOrganizationService(data, id) {
  const organizationId = parseInt(id, 10)

  if (!Number.isInteger(organizationId) || organizationId < 1) {
    const err = new Error('معرّف المؤسسة غير صالح')
    err.statusCode = HTTP_STATUS.BAD_REQUEST
    throw err
  }

  const { error } = ValidateUpdateOrganization(data)

  if (error) {
    const msg = error.details.map(d => d.message).join(' | ')
    const err = new Error(msg)
    err.statusCode = HTTP_STATUS.BAD_REQUEST
    throw err
  }

  const organization = await organizationRepository.findById(organizationId)

  if (!organization) {
    const err = new Error('المؤسسة غير موجودة')
    err.statusCode = HTTP_STATUS.NOT_FOUND
    throw err
  }

  if (data.parent_id !== undefined && data.parent_id !== null) {
    if (data.parent_id === organizationId) {
      const err = new Error('لا يمكن أن تكون المؤسسة أب لنفسها')
      err.statusCode = HTTP_STATUS.BAD_REQUEST
      throw err
    }

    const parent = await organizationRepository.findById(data.parent_id)
    if (!parent) {
      const err = new Error('المؤسسة الأب غير موجودة')
      err.statusCode = HTTP_STATUS.NOT_FOUND
      throw err
    }
  }

  if (data.location_id !== undefined && data.location_id !== null) {
    const location = await locationRepository.findById(data.location_id)
    if (!location) {
      const err = new Error('الموقع غير موجود')
      err.statusCode = HTTP_STATUS.NOT_FOUND
      throw err
    }
  }

  const payload = {}
  if (data.name !== undefined) payload.name = data.name
  if (data.parent_id !== undefined) payload.parent_id = data.parent_id
  if (data.location_id !== undefined) payload.location_id = data.location_id

  const updated = await organizationRepository.updateInstance(organization, payload)

  await invalidateOrganizations()

  return updated
}

// ================= DELETE =================
async function deleteOrganizationService(id) {
  const organizationId = parseInt(id, 10)

  if (!Number.isInteger(organizationId) || organizationId < 1) {
    const err = new Error('معرّف المؤسسة غير صالح')
    err.statusCode = HTTP_STATUS.BAD_REQUEST
    throw err
  }

  const organization = await organizationRepository.findById(organizationId)

  if (!organization) {
    const err = new Error('المؤسسة غير موجودة')
    err.statusCode = HTTP_STATUS.NOT_FOUND
    throw err
  }

  await organizationRepository.destroyInstance(organization)

  await invalidateOrganizations()

  return { id: organizationId }
}

// ================= GET ALL =================
async function getAllOrganizationsService() {
  return getOrLoad(
    KEYS.organizations(),
    () => organizationRepository.findAll(),
    { label: 'GET /api/organization/' }
  )
}

// ================= GET BY ID =================
async function getOrganizationByIdService(id) {
  const organizationId = parseInt(id, 10)

  if (!Number.isInteger(organizationId) || organizationId < 1) {
    const err = new Error('معرّف المؤسسة غير صالح')
    err.statusCode = HTTP_STATUS.BAD_REQUEST
    throw err
  }

  const organization = await organizationRepository.findByIdWithRelations(organizationId)

  if (!organization) {
    const err = new Error('المؤسسة غير موجودة')
    err.statusCode = HTTP_STATUS.NOT_FOUND
    throw err
  }

  return organization
}

module.exports = {
  createOrganizationService,
  updateOrganizationService,
  deleteOrganizationService,
  getAllOrganizationsService,
  getOrganizationByIdService
}
