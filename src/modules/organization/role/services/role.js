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
  toByDepartmentDTOList,
  toCatalogDTOList
} = require('../mappers/roleMapper')
const {
  getOrLoad,
  KEYS,
  invalidateAllUserAccessibleDepartments,
  invalidateRolesByDepartment,
  invalidateEmployeesByDepartments,
  invalidateDepartmentOverview,
  invalidateUserPermissions
} = require('../../../../core/cache/apiCacheService')
const {
  findUserIdsByOrgDeptRoleId
} = require('../../../../core/repositories/userAccessRepository')
const { API_CACHE_TTL_SECONDS } = require('../../../../core/config/env')
const { retryWithBackoff } = require('../../../../core/utils/retryWithBackoff')

function formatValidationError (error) {
  // نفس القاعدة قد تُطلق على أكثر من زوج حقول (مثل oxor على role_id/name
  // و role_id/code)، فنعرض كل رسالة مرة واحدة.
  return [...new Set(error.details.map(d => d.message))].join(' | ')
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

/**
 * يبطل كاش صلاحيات كل مستخدم معيّن على هذا الـ ODR.
 * يجب استدعاؤها قبل الحذف، لأن CASCADE يمسح user_role_assignments.
 */
async function invalidatePermissionCachesForOrgDeptRole (orgDeptRoleId) {
  const userIds = await findUserIdsByOrgDeptRoleId(orgDeptRoleId)

  if (!userIds.length) {
    return
  }

  await Promise.all(userIds.map(userId => invalidateUserPermissions(userId)))
}

function buildCamundaGroupKey (roleCode, organizationId, departmentId) {
  return `${roleCode}__ORG${organizationId}__DEPT${departmentId}`
}

// ================= CREATE =================
async function createRoleService (data, auditContext = {}) {
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

  // وضع «دور موجود»: نتحقق منه هنا لنُرجع 404 واضحاً قبل فتح المعاملة.
  let existingRole = null
  if (input.usesExistingRole) {
    existingRole = await roleRepository.findById(input.role_id)
    if (!existingRole) {
      const err = new Error('الدور غير موجود')
      err.statusCode = 404
      throw err
    }
  }

  const result = await sequelize.transaction(async (t) => {
    let role = existingRole

    if (!role) {
      // وضع «دور جديد»: الكود مفتاح فريد، فوجوده يعني أن الدور معرّف سلفاً
      // ويجب اختياره من القائمة بدل إعادة تعريفه باسم مختلف.
      const clash = await roleRepository.findByCode(input.code, { transaction: t })

      if (clash) {
        const err = new Error(
          `الكود «${input.code}» مستخدم مسبقاً للدور «${clash.name}» — اختره من قائمة الأدوار الموجودة`
        )
        err.statusCode = 409
        throw err
      }

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

  const {
    auditSuccess
  } = require('../../../../core/security/safeAudit')
  const {
    AUDIT_ACTIONS
  } = require('../../../../core/security/auditActions')

  await auditSuccess({
    userId: auditContext.actorUserId || null,
    action: AUDIT_ACTIONS.ODR_CREATED,
    resourceType: 'organization_department_role',
    resourceId: result.orgDeptRole.id,
    ipAddress: auditContext.ip || null,
    userAgent: auditContext.userAgent || null,
    details: {
      orgDeptRoleId: result.orgDeptRole.id,
      role_id: result.role.id,
      role_code: result.role.code,
      organization_id: input.organization_id,
      department_id: input.department_id,
      parent_id: input.parent_id ?? null
    }
  })

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
  await invalidatePermissionCachesForOrgDeptRole(orgDeptRoleId)

  if (input.department_id !== undefined && input.department_id !== previousDepartmentId) {
    await invalidateDepartmentRoleCaches(input.department_id)
  }

  const updated = await orgDeptRoleRepository.findByIdWithRelations(orgDeptRoleId)
  return toDTO(updated)
}

// ================= TOGGLE STATUS =================
async function toggleRoleStatusService (id, auditContext = {}) {
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

  const previousActive = Boolean(orgDeptRole.is_active)

  await orgDeptRoleRepository.updateInstance(orgDeptRole, {
    is_active: !orgDeptRole.is_active
  })

  await invalidateAllUserAccessibleDepartments()
  await invalidateDepartmentRoleCaches(orgDeptRole.department_id)
  await invalidatePermissionCachesForOrgDeptRole(orgDeptRoleId)

  const updated = await orgDeptRoleRepository.findByIdWithRelations(orgDeptRoleId)

  const {
    auditSuccess
  } = require('../../../../core/security/safeAudit')
  const {
    AUDIT_ACTIONS
  } = require('../../../../core/security/auditActions')

  await auditSuccess({
    userId: auditContext.actorUserId || null,
    action: AUDIT_ACTIONS.ODR_STATUS_CHANGED,
    resourceType: 'organization_department_role',
    resourceId: orgDeptRoleId,
    ipAddress: auditContext.ip || null,
    userAgent: auditContext.userAgent || null,
    details: {
      orgDeptRoleId,
      before: { is_active: previousActive },
      after: { is_active: Boolean(updated.is_active) }
    }
  })

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

  // يجب جلب المستخدمين قبل الحذف: CASCADE سيمسح user_role_assignments
  const affectedUserIds = await findUserIdsByOrgDeptRoleId(orgDeptRoleId)

  await orgDeptRoleRepository.destroyInstance(orgDeptRole)

  await invalidateAllUserAccessibleDepartments()
  await invalidateDepartmentRoleCaches(departmentId)
  await Promise.all(affectedUserIds.map(userId => invalidateUserPermissions(userId)))

  return { id: orgDeptRoleId }
}

// ================= GET ALL (filtered by organization) =================
async function getAllRolesService (organizationId) {
  const orgId = parseInt(organizationId, 10)

  if (!Number.isInteger(orgId) || orgId < 1) {
    const err = new Error('organization_id مطلوب ويجب أن يكون رقماً صحيحاً موجباً')
    err.statusCode = 400
    throw err
  }

  const rows = await orgDeptRoleRepository.findAllByOrganizationId(orgId)
  return toDTOList(rows)
}

// ================= GET ROLE CATALOG =================
/**
 * كل الأدوار المعرّفة في `roles`، بلا ارتباط بمؤسسة أو قسم — مصدر قائمة
 * اختيار الدور عند إنشاء سجل ربط جديد.
 */
async function getRoleCatalogService () {
  const rows = await roleRepository.findAllRoles()
  return toCatalogDTOList(rows)
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
  getRoleCatalogService,
  getRoleByIdService,
  getRolesByDepartmentService,
  toggleRoleStatusService
}
