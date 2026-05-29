'use strict'

const {
  ValidateCreateOrganization,
  ValidateUpdateOrganization
} = require('../validations/organizationValidation')

const { Organization, Location } = require('../../../entities')

// ================= CREATE =================
async function createOrganizationService(data) {
  const { error } = ValidateCreateOrganization(data)

  if (error) {
    const msg = error.details.map(d => d.message).join(' | ')
    const err = new Error(msg)
    err.statusCode = 400
    throw err
  }

  if (data.parent_id) {
    const parent = await Organization.findByPk(data.parent_id)
    if (!parent) {
      const err = new Error('المؤسسة الأب غير موجودة')
      err.statusCode = 404
      throw err
    }
  }

  if (data.location_id) {
    const location = await Location.findByPk(data.location_id)
    if (!location) {
      const err = new Error('الموقع غير موجود')
      err.statusCode = 404
      throw err
    }
  }

  const organization = await Organization.create({
    name: data.name,
    parent_id: data.parent_id ?? null,
    location_id: data.location_id ?? null
  })

  return organization
}

// ================= UPDATE =================
async function updateOrganizationService(data, id) {
  const organizationId = parseInt(id, 10)

  if (!Number.isInteger(organizationId) || organizationId < 1) {
    const err = new Error('معرّف المؤسسة غير صالح')
    err.statusCode = 400
    throw err
  }

  const { error } = ValidateUpdateOrganization(data)

  if (error) {
    const msg = error.details.map(d => d.message).join(' | ')
    const err = new Error(msg)
    err.statusCode = 400
    throw err
  }

  const organization = await Organization.findByPk(organizationId)

  if (!organization) {
    const err = new Error('المؤسسة غير موجودة')
    err.statusCode = 404
    throw err
  }

  if (data.parent_id !== undefined && data.parent_id !== null) {
    if (data.parent_id === organizationId) {
      const err = new Error('لا يمكن أن تكون المؤسسة أب لنفسها')
      err.statusCode = 400
      throw err
    }

    const parent = await Organization.findByPk(data.parent_id)
    if (!parent) {
      const err = new Error('المؤسسة الأب غير موجودة')
      err.statusCode = 404
      throw err
    }
  }

  if (data.location_id !== undefined && data.location_id !== null) {
    const location = await Location.findByPk(data.location_id)
    if (!location) {
      const err = new Error('الموقع غير موجود')
      err.statusCode = 404
      throw err
    }
  }

  const payload = {}
  if (data.name !== undefined) payload.name = data.name
  if (data.parent_id !== undefined) payload.parent_id = data.parent_id
  if (data.location_id !== undefined) payload.location_id = data.location_id

  await organization.update(payload)
  await organization.reload()

  return organization
}

// ================= DELETE =================
async function deleteOrganizationService(id) {
  const organizationId = parseInt(id, 10)

  if (!Number.isInteger(organizationId) || organizationId < 1) {
    const err = new Error('معرّف المؤسسة غير صالح')
    err.statusCode = 400
    throw err
  }

  const organization = await Organization.findByPk(organizationId)

  if (!organization) {
    const err = new Error('المؤسسة غير موجودة')
    err.statusCode = 404
    throw err
  }

  await organization.destroy()

  return { id: organizationId }
}

// ================= GET ALL =================
async function getAllOrganizationsService() {
  const rows = await Organization.findAll({
    order: [['id', 'ASC']],
    include: [
      { model: Organization, as: 'parent' },
      { model: Location, as: 'location' }
    ]
  })

  return rows
}

// ================= GET BY ID =================
async function getOrganizationByIdService(id) {
  const organizationId = parseInt(id, 10)

  if (!Number.isInteger(organizationId) || organizationId < 1) {
    const err = new Error('معرّف المؤسسة غير صالح')
    err.statusCode = 400
    throw err
  }

  const organization = await Organization.findByPk(organizationId, {
    include: [
      { model: Organization, as: 'parent' },
      { model: Organization, as: 'children' },
      { model: Location, as: 'location' }
    ]
  })

  if (!organization) {
    const err = new Error('المؤسسة غير موجودة')
    err.statusCode = 404
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
