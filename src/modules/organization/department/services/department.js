'use strict'

const {
  ValidateCreateDepartment,
  ValidateUpdateDepartment
} = require('../validations/departmentValidation')

const departmentRepository = require('../repositories/departmentRepository')
const organizationRepository = require('../../organization/repositories/organizationRepository')
const {
  toCreateInput,
  toUpdateInput,
  toCreatePayload,
  toUpdatePayload,
  toDTO,
  toDTOList,
  toLeafDTOList,
  toOverviewDTO
} = require('../mappers/departmentMapper')
const {
  getOrLoad,
  KEYS,
  invalidateDepartmentLeaves,
  invalidateDepartmentOverview,
  invalidateEmployeesByDepartments,
  invalidateRolesByDepartment
} = require('../../../../core/cache/apiCacheService')
const { API_CACHE_TTL_SECONDS } = require('../../../../core/config/env')
const { retryWithBackoff } = require('../../../../core/utils/retryWithBackoff')

function formatValidationError (error) {
  return error.details.map(d => d.message).join(' | ')
}

async function invalidateDepartmentStructureCaches ({
  organizationId,
  departmentId,
  parentId = null
} = {}) {
  if (organizationId != null) {
    await invalidateDepartmentLeaves(organizationId)
  }

  if (departmentId != null) {
    await invalidateDepartmentOverview(departmentId)
    await invalidateRolesByDepartment(departmentId)
  }

  if (parentId != null) {
    await invalidateDepartmentOverview(parentId)
  }

  await invalidateEmployeesByDepartments()
}

// ================= CREATE =================
async function createDepartmentService (data) {
  const { error, value } = ValidateCreateDepartment(data)

  if (error) {
    const err = new Error(formatValidationError(error))
    err.statusCode = 400
    throw err
  }

  const input = toCreateInput(value)

  const organization = await organizationRepository.findById(input.organization_id)
  if (!organization) {
    const err = new Error('المؤسسة غير موجودة')
    err.statusCode = 404
    throw err
  }

  if (input.parent_id) {
    const parent = await departmentRepository.findById(input.parent_id)
    if (!parent) {
      const err = new Error('القسم الأب غير موجود')
      err.statusCode = 404
      throw err
    }
  }

  const department = await departmentRepository.create(toCreatePayload(input))

  await invalidateDepartmentStructureCaches({
    organizationId: input.organization_id,
    departmentId: department.id,
    parentId: input.parent_id ?? null
  })

  return toDTO(department)
}

// ================= UPDATE =================
async function updateDepartmentService (data, id) {
  const departmentId = parseInt(id, 10)

  if (!Number.isInteger(departmentId) || departmentId < 1) {
    const err = new Error('معرّف القسم غير صالح')
    err.statusCode = 400
    throw err
  }

  const { error, value } = ValidateUpdateDepartment(data)

  if (error) {
    const err = new Error(formatValidationError(error))
    err.statusCode = 400
    throw err
  }

  const department = await departmentRepository.findById(departmentId)

  if (!department) {
    const err = new Error('القسم غير موجود')
    err.statusCode = 404
    throw err
  }

  const input = toUpdateInput(value)
  const previousOrganizationId = department.organization_id
  const previousParentId = department.parent_id

  if (input.organization_id !== undefined) {
    const organization = await organizationRepository.findById(input.organization_id)
    if (!organization) {
      const err = new Error('المؤسسة غير موجودة')
      err.statusCode = 404
      throw err
    }
  }

  if (input.parent_id !== undefined && input.parent_id !== null) {
    if (input.parent_id === departmentId) {
      const err = new Error('لا يمكن أن يكون القسم أب لنفسه')
      err.statusCode = 400
      throw err
    }

    const parent = await departmentRepository.findById(input.parent_id)
    if (!parent) {
      const err = new Error('القسم الأب غير موجود')
      err.statusCode = 404
      throw err
    }
  }

  const updated = await departmentRepository.updateInstance(
    department,
    toUpdatePayload(input)
  )

  await invalidateDepartmentStructureCaches({
    organizationId: input.organization_id ?? previousOrganizationId,
    departmentId,
    parentId: input.parent_id !== undefined ? input.parent_id : previousParentId
  })

  if (input.organization_id !== undefined && input.organization_id !== previousOrganizationId) {
    await invalidateDepartmentLeaves(previousOrganizationId)
  }

  if (input.parent_id !== undefined && input.parent_id !== previousParentId) {
    await invalidateDepartmentOverview(previousParentId)
  }

  return toDTO(updated)
}

// ================= TOGGLE STATUS =================
async function toggleDepartmentStatusService (id) {
  const departmentId = parseInt(id, 10)

  if (!Number.isInteger(departmentId) || departmentId < 1) {
    const err = new Error('معرّف القسم غير صالح')
    err.statusCode = 400
    throw err
  }

  const department = await departmentRepository.findById(departmentId)

  if (!department) {
    const err = new Error('القسم غير موجود')
    err.statusCode = 404
    throw err
  }

  const updated = await departmentRepository.updateInstance(department, {
    is_active: !department.is_active
  })

  await invalidateDepartmentStructureCaches({
    organizationId: department.organization_id,
    departmentId,
    parentId: department.parent_id
  })

  return toDTO(updated)
}

// ================= DELETE =================
async function deleteDepartmentService (id) {
  const departmentId = parseInt(id, 10)

  if (!Number.isInteger(departmentId) || departmentId < 1) {
    const err = new Error('معرّف القسم غير صالح')
    err.statusCode = 400
    throw err
  }

  const department = await departmentRepository.findById(departmentId)

  if (!department) {
    const err = new Error('القسم غير موجود')
    err.statusCode = 404
    throw err
  }

  const organizationId = department.organization_id
  const parentId = department.parent_id

  await departmentRepository.destroyInstance(department)

  await invalidateDepartmentStructureCaches({
    organizationId,
    departmentId,
    parentId
  })

  return { id: departmentId }
}

// ================= GET ALL =================
async function getAllDepartmentsService () {
  const rows = await departmentRepository.findAll()
  return toDTOList(rows)
}

// ================= GET LEAVES BY ORGANIZATION =================
async function loadLeafDepartmentsByOrganization (orgId) {
  const departments = await departmentRepository.findAllByOrganizationId(orgId)

  if (departments.length === 0) return []

  const byId = new Map(departments.map(d => [d.id, d]))
  const parentIds = new Set(
    departments
      .map(d => d.parent_id)
      .filter(pid => pid !== null && pid !== undefined)
  )

  const leaves = departments.filter(d => !parentIds.has(d.id))

  return toLeafDTOList(
    leaves.map(leaf => {
      const path = []
      let current = leaf
      const visited = new Set()

      while (current && !visited.has(current.id)) {
        visited.add(current.id)
        path.unshift(current.name)
        current = current.parent_id ? byId.get(current.parent_id) : null
      }

      return {
        id: leaf.id,
        name: path.join('\\')
      }
    })
  )
}

async function getLeafDepartmentsByOrganizationService (organizationId) {
  const orgId = parseInt(organizationId, 10)

  if (!Number.isInteger(orgId) || orgId < 1) {
    const err = new Error('معرّف المؤسسة غير صالح')
    err.statusCode = 400
    throw err
  }

  const organization = await organizationRepository.findById(orgId)
  if (!organization) {
    const err = new Error('المؤسسة غير موجودة')
    err.statusCode = 404
    throw err
  }

  return getOrLoad(
    KEYS.departmentLeaves(orgId),
    () =>
      retryWithBackoff(() => loadLeafDepartmentsByOrganization(orgId), {
        label: `department:leaves:${orgId}`
      }),
    {
      label: `Department GET /api/department/by-organization/${orgId}/leaves`,
      ttlSeconds: API_CACHE_TTL_SECONDS
    }
  )
}

// ================= GET OVERVIEW =================
async function loadDepartmentOverview (departmentId) {
  const department = await departmentRepository.findByIdWithRelations(departmentId)

  if (!department) {
    const err = new Error('القسم غير موجود')
    err.statusCode = 404
    throw err
  }

  const orgDeptRoles =
    await departmentRepository.findRolesWithUsersByDepartmentId(departmentId)

  const employeesById = new Map()
  let manager = null

  for (const odr of orgDeptRoles) {
    const roleName = odr.role ? odr.role.name : null
    const assignments = odr.user_assignments || []

    for (const assignment of assignments) {
      const user = assignment.user
      if (!assignment.is_active || !user) continue

      if (!employeesById.has(user.id)) {
        employeesById.set(user.id, {
          id: user.id,
          userName: user.userName,
          email: user.email,
          phone_number: user.phone_number,
          role: roleName
        })
      }

      if (!manager && odr.parent_id == null) {
        manager = { id: user.id, userName: user.userName, role: roleName }
      }
    }
  }

  const employees = Array.from(employeesById.values())
  const userIds = employees.map(e => e.id)
  const transactionsCount =
    await departmentRepository.countTransactionsByUserIds(userIds)

  const sections = (department.children || []).map(child => ({
    id: child.id,
    name: child.name,
    is_active: child.is_active
  }))

  return toOverviewDTO({
    department,
    manager,
    employees,
    sections,
    transactionsCount
  })
}

async function getDepartmentOverviewService (id) {
  const departmentId = parseInt(id, 10)

  if (!Number.isInteger(departmentId) || departmentId < 1) {
    const err = new Error('معرّف القسم غير صالح')
    err.statusCode = 400
    throw err
  }

  return getOrLoad(
    KEYS.departmentOverview(departmentId),
    () => loadDepartmentOverview(departmentId),
    { label: `Department overview GET /api/department/${departmentId}/overview` }
  )
}

// ================= GET BY ID =================
async function getDepartmentByIdService (id) {
  const departmentId = parseInt(id, 10)

  if (!Number.isInteger(departmentId) || departmentId < 1) {
    const err = new Error('معرّف القسم غير صالح')
    err.statusCode = 400
    throw err
  }

  const department = await departmentRepository.findByIdWithRelations(departmentId)

  if (!department) {
    const err = new Error('القسم غير موجود')
    err.statusCode = 404
    throw err
  }

  return toDTO(department)
}

module.exports = {
  createDepartmentService,
  updateDepartmentService,
  deleteDepartmentService,
  getAllDepartmentsService,
  getDepartmentByIdService,
  getDepartmentOverviewService,
  getLeafDepartmentsByOrganizationService,
  toggleDepartmentStatusService
}
