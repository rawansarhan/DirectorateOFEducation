'use strict'

const { RolePermission, Permission, OrgDeptRole } = require('../../../../entities')

async function findByOrgDeptRoleId (organizationDepartmentRolesId) {
  return RolePermission.findAll({
    where: {
      organization_department_roles_id: organizationDepartmentRolesId
    },
    include: [
      {
        model: Permission,
        as: 'permissions',
        attributes: ['id', 'name', 'display_name']
      }
    ],
    order: [['permission_id', 'ASC']]
  })
}

async function findPermissionNamesByOrgDeptRoleIds (orgDeptRoleIds = []) {
  if (!orgDeptRoleIds.length) {
    return []
  }

  const rows = await RolePermission.findAll({
    where: {
      organization_department_roles_id: orgDeptRoleIds
    },
    include: [
      {
        model: Permission,
        as: 'permissions',
        attributes: ['name'],
        required: true
      }
    ]
  })

  return [
    ...new Set(
      rows
        .map(row => row.permissions?.name)
        .filter(Boolean)
    )
  ]
}

async function replacePermissionsForOrgDeptRole (
  organizationDepartmentRolesId,
  permissionIds = [],
  options = {}
) {
  await RolePermission.destroy({
    where: {
      organization_department_roles_id: organizationDepartmentRolesId
    },
    transaction: options.transaction
  })

  if (!permissionIds.length) {
    return []
  }

  const rows = permissionIds.map(permissionId => ({
    organization_department_roles_id: organizationDepartmentRolesId,
    permission_id: permissionId
  }))

  return RolePermission.bulkCreate(rows, {
    transaction: options.transaction,
    ignoreDuplicates: true
  })
}

async function addPermissionsForOrgDeptRole (
  organizationDepartmentRolesId,
  permissionIds = [],
  options = {}
) {
  if (!permissionIds.length) {
    return []
  }

  const rows = permissionIds.map(permissionId => ({
    organization_department_roles_id: organizationDepartmentRolesId,
    permission_id: permissionId
  }))

  return RolePermission.bulkCreate(rows, {
    transaction: options.transaction,
    ignoreDuplicates: true
  })
}

async function findOrgDeptRoleByOrgDeptRole ({
  organizationId,
  departmentId,
  roleId
}) {
  return OrgDeptRole.findOne({
    where: {
      organization_id: organizationId,
      department_id: departmentId,
      role_id: roleId
    }
  })
}

module.exports = {
  findByOrgDeptRoleId,
  findPermissionNamesByOrgDeptRoleIds,
  replacePermissionsForOrgDeptRole,
  addPermissionsForOrgDeptRole,
  findOrgDeptRoleByOrgDeptRole
}
