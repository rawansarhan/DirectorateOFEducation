'use strict'

const {
  ValidateCreateOrganization,
  ValidateUpdateOrganization
} = require('../validations/organizationValidation')

const organizationRepository = require('../repositories/organizationRepository')
const locationRepository = require('../../location/repositories/locationRepository')
const {
  toCreateInput,
  toUpdateInput,
  toCreatePayload,
  toUpdatePayload,
  toDTO,
  toDTOList
} = require('../mappers/organizationMapper')

function formatValidationError (error) {
  return error.details.map(d => d.message).join(' | ')
}

// ================= CREATE =================
async function createOrganizationService (data, auditContext = {}) {
  const { error, value } = ValidateCreateOrganization(data)

  if (error) {
    const err = new Error(formatValidationError(error))
    err.statusCode = 400
    throw err
  }

  const input = toCreateInput(value)

  if (input.parent_id) {
    const parent = await organizationRepository.findById(input.parent_id)
    if (!parent) {
      const err = new Error('المؤسسة الأب غير موجودة')
      err.statusCode = 404
      throw err
    }
  }

  if (input.location_id) {
    const location = await locationRepository.findById(input.location_id)
    if (!location) {
      const err = new Error('الموقع غير موجود')
      err.statusCode = 404
      throw err
    }
  }

  const organization = await organizationRepository.create(toCreatePayload(input))

  const {
    auditSuccess
  } = require('../../../../core/security/safeAudit')
  const {
    AUDIT_ACTIONS
  } = require('../../../../core/security/auditActions')

  await auditSuccess({
    userId: auditContext.actorUserId || null,
    action: AUDIT_ACTIONS.ORGANIZATION_CREATED,
    resourceType: 'organization',
    resourceId: organization.id,
    ipAddress: auditContext.ip || null,
    userAgent: auditContext.userAgent || null,
    details: {
      organizationId: organization.id,
      name: organization.name,
      parent_id: organization.parent_id ?? null
    }
  })

  return toDTO(organization)
}

// ================= UPDATE =================
async function updateOrganizationService (data, id) {
  const organizationId = parseInt(id, 10)

  if (!Number.isInteger(organizationId) || organizationId < 1) {
    const err = new Error('معرّف المؤسسة غير صالح')
    err.statusCode = 400
    throw err
  }

  const { error, value } = ValidateUpdateOrganization(data)

  if (error) {
    const err = new Error(formatValidationError(error))
    err.statusCode = 400
    throw err
  }

  const organization = await organizationRepository.findById(organizationId)

  if (!organization) {
    const err = new Error('المؤسسة غير موجودة')
    err.statusCode = 404
    throw err
  }

  const input = toUpdateInput(value)

  if (input.parent_id !== undefined && input.parent_id !== null) {
    if (input.parent_id === organizationId) {
      const err = new Error('لا يمكن أن تكون المؤسسة أب لنفسها')
      err.statusCode = 400
      throw err
    }

    const parent = await organizationRepository.findById(input.parent_id)
    if (!parent) {
      const err = new Error('المؤسسة الأب غير موجودة')
      err.statusCode = 404
      throw err
    }
  }

  if (input.location_id !== undefined && input.location_id !== null) {
    const location = await locationRepository.findById(input.location_id)
    if (!location) {
      const err = new Error('الموقع غير موجود')
      err.statusCode = 404
      throw err
    }
  }

  const updated = await organizationRepository.updateInstance(
    organization,
    toUpdatePayload(input)
  )

  return toDTO(updated)
}

// ================= DELETE =================
async function deleteOrganizationService (id) {
  const organizationId = parseInt(id, 10)

  if (!Number.isInteger(organizationId) || organizationId < 1) {
    const err = new Error('معرّف المؤسسة غير صالح')
    err.statusCode = 400
    throw err
  }

  const organization = await organizationRepository.findById(organizationId)

  if (!organization) {
    const err = new Error('المؤسسة غير موجودة')
    err.statusCode = 404
    throw err
  }

  await organizationRepository.destroyInstance(organization)

  return { id: organizationId }
}

// ================= GET ALL =================
async function getAllOrganizationsService () {
  const rows = await organizationRepository.findAll()
  return toDTOList(rows)
}

// ================= GET BY ID =================
async function getOrganizationByIdService (id) {
  const organizationId = parseInt(id, 10)

  if (!Number.isInteger(organizationId) || organizationId < 1) {
    const err = new Error('معرّف المؤسسة غير صالح')
    err.statusCode = 400
    throw err
  }

  const organization = await organizationRepository.findByIdWithRelations(organizationId)

  if (!organization) {
    const err = new Error('المؤسسة غير موجودة')
    err.statusCode = 404
    throw err
  }

  return toDTO(organization)
}

module.exports = {
  createOrganizationService,
  updateOrganizationService,
  deleteOrganizationService,
  getAllOrganizationsService,
  getOrganizationByIdService
}
