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

async function createRolePermissions (body) {
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

  return {
    message: 'تم ربط الصلاحيات بالدور بنجاح',
    data: toRolePermissionDTO({
      orgDeptRole,
      permissionRows: rows
    })
  }
}

async function updateRolePermissions (body) {
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
  getRolePermissions,
  createRolePermissions,
  updateRolePermissions
}
