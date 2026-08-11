'use strict'

const permissionRepository = require('../repositories/permissionRepository')
const rolePermissionRepository = require('../repositories/rolePermissionRepository')
const {
  toPermissionDTOList,
  toRolePermissionDTO
} = require('../mappers/permissionRoleMapper')
const {
  createHttpError,
  parseOrgDeptRoleBody,
  parseOrgDeptRoleQuery
} = require('../validations/permissionRoleValidations')
const {
  KEYS,
  getOrLoad,
  invalidatePermissionsAll,
  invalidateRolePermissionsByOrgDeptRole,
  invalidateUserPermissionCaches
} = require('../../../../core/cache/apiCacheService')
//هذه اللدالة لتحديد الدور و المنصب و المراد تحديده
async function resolveOrgDeptRole ({ organizationId, departmentId, roleId }) {
  const orgDeptRole = await rolePermissionRepository.findOrgDeptRoleByOrgDeptRole({
    organizationId,
    departmentId,
    roleId
  })

  if (!orgDeptRole) {
    throw createHttpError(
      'لم يتم العثور على organization_department_roles مطابق لـ (organization_id, department_id, role_id)',
      404,
      'NOT_FOUND'
    )
  }

  return orgDeptRole
}
//هذه الدالة لتحديد الصلاحيات الموجودة في النظام 
async function assertPermissionIdsExist (permissionIds) {
  const found = await permissionRepository.findByIds(permissionIds)

  if (found.length !== permissionIds.length) {
    const foundIds = new Set(found.map(row => Number(row.id)))
    const missing = permissionIds.filter(id => !foundIds.has(id))
    throw createHttpError(
      `صلاحيات غير موجودة: ${missing.join(', ')}`,
      400,
      'VALIDATION_ERROR'
    )
  }

  return found
}

const PERMISSION_AUDIENCES = {
  employee: ['employee', 'employee,citizen,admin'],
  admin: ['admin', 'employee,citizen,admin']
}
//هذه الدلة لجلب الصلاحيات الموجودة في النظام 
async function listPermissions () {
  const rows = await getOrLoad(
    KEYS.permissionsAll(),
    () => permissionRepository.findAllPermissions(),
    { label: 'auth.permissions.all', ttlSeconds: 300 }
  )

  return {
    message: 'تم جلب الصلاحيات بنجاح',
    data: toPermissionDTOList(rows)
  }
}
//هذه الدالة لجلب الصلاحيات الموجودة بالنظام المعين 
async function listPermissionsByAudience (audience) {
  const types = PERMISSION_AUDIENCES[audience]

  if (!types) {
    throw createHttpError('نوع عرض الصلاحيات غير صالح', 400, 'VALIDATION_ERROR')
  }

  const rows = await getOrLoad(
    KEYS.permissionsByAudience(audience),
    () => permissionRepository.findByTypes(types),
    {
      label: `auth.permissions.audience:${audience}`,
      ttlSeconds: 300
    }
  )

  return {
    message:
      audience === 'admin'
        ? 'تم جلب صلاحيات الإدارة بنجاح'
        : 'تم جلب صلاحيات الموظف بنجاح',
    data: toPermissionDTOList(rows)
  }
}
//هذه الدالة لجلب الصلاحيات الموجودة في دور معين 
async function getRolePermissions (query) {
  const { organizationId, departmentId, roleId } = parseOrgDeptRoleQuery(query)
  const orgDeptRole = await resolveOrgDeptRole({
    organizationId,
    departmentId,
    roleId
  })

  const rows = await getOrLoad(
    KEYS.rolePermissionsByOrgDeptRole(orgDeptRole.id),
    () => rolePermissionRepository.findByOrgDeptRoleId(orgDeptRole.id),
    {
      label: `auth.role-permissions.odr:${orgDeptRole.id}`,
      ttlSeconds: 120
    }
  )

  return {
    message: 'تم جلب صلاحيات الدور بنجاح',
    data: toRolePermissionDTO({
      orgDeptRole,
      permissionRows: rows
    })
  }
}
//انشاء صلاحية لرول معين 
async function createRolePermissions (body, auditContext = {}) {
  const { organizationId, departmentId, roleId, permissionIds } =
    parseOrgDeptRoleBody(body)

  if (!permissionIds.length) {
    throw createHttpError('permission_id لا يجوز أن يكون فارغاً عند الإنشاء')
  }

  const orgDeptRole = await resolveOrgDeptRole({
    organizationId,
    departmentId,
    roleId
  })
//تحديد الصلاحية الموجودة في النظام
  await assertPermissionIdsExist(permissionIds)
  await rolePermissionRepository.addPermissionsForOrgDeptRole(
    orgDeptRole.id,
    permissionIds
  )

  await Promise.all([
    invalidateRolePermissionsByOrgDeptRole(orgDeptRole.id),
    invalidateUserPermissionCaches()
  ])

  const rows = await rolePermissionRepository.findByOrgDeptRoleId(orgDeptRole.id)
//تسجيل حالة النجاح في النظام 
  const {
    auditSuccess
  } = require('../../../../core/security/safeAudit')
  const {
    AUDIT_ACTIONS
  } = require('../../../../core/security/auditActions')

  await auditSuccess({
    userId: auditContext.actorUserId || null,
    action: AUDIT_ACTIONS.ROLE_PERMISSIONS_CREATED,
    resourceType: 'organization_department_role',
    resourceId: orgDeptRole.id,
    ipAddress: auditContext.ip || null,
    userAgent: auditContext.userAgent || null,
    details: {
      organization_id: organizationId,
      department_id: departmentId,
      role_id: roleId,
      permissionIds,
      permissionCount: permissionIds.length
    }
  })

  return {
    message: 'تم ربط الصلاحيات بالدور بنجاح',
    data: toRolePermissionDTO({
      orgDeptRole,
      permissionRows: rows
    })
  }
}
//تحديث صلاحيات الدور
async function updateRolePermissions (body, auditContext = {}) {
  const { organizationId, departmentId, roleId, permissionIds } =
    parseOrgDeptRoleBody(body)

  const orgDeptRole = await resolveOrgDeptRole({
    organizationId,
    departmentId,
    roleId
  })

  if (permissionIds.length) {
    await assertPermissionIdsExist(permissionIds)
  }

  await rolePermissionRepository.replacePermissionsForOrgDeptRole(
    orgDeptRole.id,
    permissionIds
  )

  await Promise.all([
    invalidateRolePermissionsByOrgDeptRole(orgDeptRole.id),
    invalidateUserPermissionCaches()
  ])

  const rows = await rolePermissionRepository.findByOrgDeptRoleId(orgDeptRole.id)

  const {
    auditSuccess
  } = require('../../../../core/security/safeAudit')
  const {
    AUDIT_ACTIONS
  } = require('../../../../core/security/auditActions')

  await auditSuccess({
    userId: auditContext.actorUserId || null,
    action: AUDIT_ACTIONS.ROLE_PERMISSIONS_UPDATED,
    resourceType: 'organization_department_role',
    resourceId: orgDeptRole.id,
    ipAddress: auditContext.ip || null,
    userAgent: auditContext.userAgent || null,
    details: {
      organization_id: organizationId,
      department_id: departmentId,
      role_id: roleId,
      permissionIds,
      permissionCount: permissionIds.length
    }
  })

  return {
    message: 'تم تحديث صلاحيات الدور بنجاح',
    data: toRolePermissionDTO({
      orgDeptRole,
      permissionRows: rows
    })
  }
}

module.exports = {
  listPermissions,
  listPermissionsByAudience,
  getRolePermissions,
  createRolePermissions,
  updateRolePermissions
}
