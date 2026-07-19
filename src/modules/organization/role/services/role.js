'use strict'

const {
  ValidateCreateRole,
  ValidateUpdateRole
} = require('../validations/roleValidation')

const { sequelize } = require('../../../../entities')

const organizationRepository = require('../../organization/repositories/organizationRepository')
const departmentRepository = require('../../department/repositories/departmentRepository')
const roleRepository = require('../repositories/roleRepository')
const orgDeptRoleRepository = require('../repositories/orgDeptRoleRepository')
const {
  toCreateInput,
  toUpdateInput,
  toUpdatePayload,
  toDTO,
  toDTOList,
  toByDepartmentDTOList
} = require('../mappers/roleMapper')
const {
  getOrLoad,
  KEYS,
  invalidateAllUserAccessibleDepartments,
  invalidateRolesByDepartment,
  invalidateEmployeesByDepartments,
  invalidateDepartmentOverview
} = require('../../../../core/cache/apiCacheService')
const { API_CACHE_TTL_SECONDS } = require('../../../../core/config/env')
const { retryWithBackoff } = require('../../../../core/utils/retryWithBackoff')

function formatValidationError (error) {
  return error.details.map(d => d.message).join(' | ')
}

async function invalidateDepartmentRoleCaches (departmentId, { includeOverview = true } = {}) {
  if (departmentId == null) {
    return
  }

  await invalidateRolesByDepartment(departmentId)
  await invalidateEmployeesByDepartments()

  if (includeOverview) {
    await invalidateDepartmentOverview(departmentId)
  }
}

function buildCamundaGroupKey (roleCode, organizationId, departmentId) {
  return `${roleCode}__ORG${organizationId}__DEPT${departmentId}`
}

// ================= CREATE =================
async function createRoleService (data) {
  const { error, value } = ValidateCreateRole(data)

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

  const department = await departmentRepository.findById(input.department_id)
  if (!department) {
    const err = new Error('القسم غير موجود')
    err.statusCode = 404
    throw err
  }

  if (department.organization_id !== organization.id) {
    const err = new Error('القسم لا ينتمي إلى المؤسسة المحددة')
    err.statusCode = 400
    throw err
  }

  if (input.parent_id) {
    const parent = await orgDeptRoleRepository.findById(input.parent_id)
    if (!parent) {
      const err = new Error('الدور الأب غير موجود')
      err.statusCode = 404
      throw err
    }
  }

  const result = await sequelize.transaction(async (t) => {
    let role = await roleRepository.findByCode(input.code, { transaction: t })

    if (!role) {
      role = await roleRepository.create(
        {
          name: input.name,
          code: input.code
        },
        { transaction: t }
      )
    }

    const duplicate = await orgDeptRoleRepository.findByRoleOrgDept(
      role.id,
      input.organization_id,
      input.department_id,
      { transaction: t }
    )

    if (duplicate) {
      const err = new Error('هذا الدور مرتبط مسبقاً بهذه المؤسسة والقسم')
      err.statusCode = 409
      throw err
    }

    const orgDeptRole = await orgDeptRoleRepository.create(
      {
        role_id: role.id,
        organization_id: input.organization_id,
        department_id: input.department_id,
        parent_id: input.parent_id ?? null,
        is_active: true,
        camunda_group_key: buildCamundaGroupKey(
          role.code,
          input.organization_id,
          input.department_id
        )
      },
      { transaction: t }
    )

    return { role, orgDeptRole }
  })

  await invalidateAllUserAccessibleDepartments()
  await invalidateDepartmentRoleCaches(input.department_id)

  const created = await orgDeptRoleRepository.findByIdWithRelations(result.orgDeptRole.id)
  return toDTO(created)
}

// ================= UPDATE =================
async function updateRoleService (data, id) {
  const orgDeptRoleId = parseInt(id, 10)

  if (!Number.isInteger(orgDeptRoleId) || orgDeptRoleId < 1) {
    const err = new Error('المعرّف غير صالح')
    err.statusCode = 400
    throw err
  }

  const { error, value } = ValidateUpdateRole(data)

  if (error) {
    const err = new Error(formatValidationError(error))
    err.statusCode = 400
    throw err
  }

  const orgDeptRole = await orgDeptRoleRepository.findByIdWithRole(orgDeptRoleId)

  if (!orgDeptRole) {
    const err = new Error('السجل غير موجود')
    err.statusCode = 404
    throw err
  }

  const input = toUpdateInput(value)
  const previousDepartmentId = orgDeptRole.department_id
  const newOrgId = input.organization_id ?? orgDeptRole.organization_id
  const newDeptId = input.department_id ?? orgDeptRole.department_id

  if (input.organization_id !== undefined) {
    const organization = await organizationRepository.findById(input.organization_id)
    if (!organization) {
      const err = new Error('المؤسسة غير موجودة')
      err.statusCode = 404
      throw err
    }
  }

  if (input.department_id !== undefined) {
    const department = await departmentRepository.findById(input.department_id)
    if (!department) {
      const err = new Error('القسم غير موجود')
      err.statusCode = 404
      throw err
    }
  }

  if (input.organization_id !== undefined || input.department_id !== undefined) {
    const dept = await departmentRepository.findById(newDeptId)
    if (dept && dept.organization_id !== newOrgId) {
      const err = new Error('القسم لا ينتمي إلى المؤسسة المحددة')
      err.statusCode = 400
      throw err
    }
  }

  if (input.parent_id !== undefined && input.parent_id !== null) {
    if (input.parent_id === orgDeptRoleId) {
      const err = new Error('لا يمكن أن يكون السجل أب لنفسه')
      err.statusCode = 400
      throw err
    }

    const parent = await orgDeptRoleRepository.findById(input.parent_id)
    if (!parent) {
      const err = new Error('الدور الأب غير موجود')
      err.statusCode = 404
      throw err
    }
  }

  if (input.organization_id !== undefined || input.department_id !== undefined) {
    const duplicate = await orgDeptRoleRepository.findByRoleOrgDept(
      orgDeptRole.role_id,
      newOrgId,
      newDeptId
    )

    if (duplicate && duplicate.id !== orgDeptRoleId) {
      const err = new Error('هذا الدور مرتبط مسبقاً بهذه المؤسسة والقسم')
      err.statusCode = 409
      throw err
    }
  }

  const payload = toUpdatePayload(input)

  if (input.organization_id !== undefined || input.department_id !== undefined) {
    payload.camunda_group_key = buildCamundaGroupKey(
      orgDeptRole.role.code,
      newOrgId,
      newDeptId
    )
  }

  await orgDeptRoleRepository.updateInstance(orgDeptRole, payload)

  await invalidateAllUserAccessibleDepartments()
  await invalidateDepartmentRoleCaches(previousDepartmentId)

  if (input.department_id !== undefined && input.department_id !== previousDepartmentId) {
    await invalidateDepartmentRoleCaches(input.department_id)
  }

  const updated = await orgDeptRoleRepository.findByIdWithRelations(orgDeptRoleId)
  return toDTO(updated)
}

// ================= TOGGLE STATUS =================
async function toggleRoleStatusService (id) {
  const orgDeptRoleId = parseInt(id, 10)

  if (!Number.isInteger(orgDeptRoleId) || orgDeptRoleId < 1) {
    const err = new Error('المعرّف غير صالح')
    err.statusCode = 400
    throw err
  }

  const orgDeptRole = await orgDeptRoleRepository.findById(orgDeptRoleId)

  if (!orgDeptRole) {
    const err = new Error('السجل غير موجود')
    err.statusCode = 404
    throw err
  }

  await orgDeptRoleRepository.updateInstance(orgDeptRole, {
    is_active: !orgDeptRole.is_active
  })

  await invalidateAllUserAccessibleDepartments()
  await invalidateDepartmentRoleCaches(orgDeptRole.department_id)

  const updated = await orgDeptRoleRepository.findByIdWithRelations(orgDeptRoleId)
  return toDTO(updated)
}

// ================= DELETE =================
async function deleteRoleService (id) {
  const orgDeptRoleId = parseInt(id, 10)

  if (!Number.isInteger(orgDeptRoleId) || orgDeptRoleId < 1) {
    const err = new Error('المعرّف غير صالح')
    err.statusCode = 400
    throw err
  }

  const orgDeptRole = await orgDeptRoleRepository.findById(orgDeptRoleId)

  if (!orgDeptRole) {
    const err = new Error('السجل غير موجود')
    err.statusCode = 404
    throw err
  }

  const departmentId = orgDeptRole.department_id

  await orgDeptRoleRepository.destroyInstance(orgDeptRole)

  await invalidateAllUserAccessibleDepartments()
  await invalidateDepartmentRoleCaches(departmentId)

  return { id: orgDeptRoleId }
}

// ================= GET ALL =================
async function getAllRolesService () {
  const rows = await orgDeptRoleRepository.findAll()
  return toDTOList(rows)
}

// ================= GET BY ID =================
async function getRoleByIdService (id) {
  const orgDeptRoleId = parseInt(id, 10)

  if (!Number.isInteger(orgDeptRoleId) || orgDeptRoleId < 1) {
    const err = new Error('المعرّف غير صالح')
    err.statusCode = 400
    throw err
  }

  const orgDeptRole = await orgDeptRoleRepository.findByIdWithRelations(
    orgDeptRoleId,
    { includeChildren: true }
  )

  if (!orgDeptRole) {
    const err = new Error('السجل غير موجود')
    err.statusCode = 404
    throw err
  }

  return toDTO(orgDeptRole)
}

// ================= GET ROLES BY DEPARTMENT =================
async function loadRolesByDepartment (deptId) {
  const rows = await orgDeptRoleRepository.findActiveByDepartmentIdWithRole(deptId)

  return toByDepartmentDTOList(
    rows
      .filter(r => r.role)
      .map(r => ({
        id: r.role.id,
        organization_department_roles_id: r.id,
        name: r.role.name,
        code: r.role.code
      }))
  )
}

async function getRolesByDepartmentService (departmentId) {
  const deptId = parseInt(departmentId, 10)

  if (!Number.isInteger(deptId) || deptId < 1) {
    const err = new Error('معرّف القسم غير صالح')
    err.statusCode = 400
    throw err
  }

  const department = await departmentRepository.findById(deptId)
  if (!department) {
    const err = new Error('القسم غير موجود')
    err.statusCode = 404
    throw err
  }

  return getOrLoad(
    KEYS.rolesByDepartment(deptId),
    () =>
      retryWithBackoff(() => loadRolesByDepartment(deptId), {
        label: `role:by-dept:${deptId}`
      }),
    {
      label: `Role GET /api/role/by-department/${deptId}`,
      ttlSeconds: API_CACHE_TTL_SECONDS
    }
  )
}

module.exports = {
  createRoleService,
  updateRoleService,
  deleteRoleService,
  getAllRolesService,
  getRoleByIdService,
  getRolesByDepartmentService,
  toggleRoleStatusService
}
