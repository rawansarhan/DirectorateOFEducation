'use strict'

const { Op } = require('sequelize')
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
  const where = {}

  if (organizationId == null) {
    where.organization_id = { [Op.is]: null }
  } else {
    where.organization_id = organizationId
  }

  if (departmentId == null) {
    where.department_id = { [Op.is]: null }
  } else {
    where.department_id = departmentId
  }

  if (roleId == null) {
    where.role_id = { [Op.is]: null }
  } else {
    where.role_id = roleId
  }

  return OrgDeptRole.findOne({ where })
}

module.exports = {
  findByOrgDeptRoleId,
  findPermissionNamesByOrgDeptRoleIds,
  replacePermissionsForOrgDeptRole,
  addPermissionsForOrgDeptRole,
  findOrgDeptRoleByOrgDeptRole
}
