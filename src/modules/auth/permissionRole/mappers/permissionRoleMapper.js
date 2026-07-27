'use strict'

const {
  PermissionOutputDTO,
  RolePermissionOutputDTO
} = require('../dto/PermissionRoleDTO')

function toPlain (row) {
  if (!row) return null
  return typeof row.get === 'function' ? row.get({ plain: true }) : row
}

function toPermissionDTO (row) {
  return new PermissionOutputDTO(toPlain(row) || {})
}

function toPermissionDTOList (rows = []) {
  return rows.map(toPermissionDTO)
}

function toRolePermissionDTO ({
  orgDeptRole,
  permissionRows = []
}) {
  const permissions = permissionRows.map(row => {
    const plain = toPlain(row)
    const permission = plain?.permissions || plain
    return {
      id: permission?.id ?? plain?.permission_id ?? null,
      name: permission?.name ?? null,
      display_name: permission?.display_name ?? permission?.name ?? null
    }
  })

  return new RolePermissionOutputDTO({
    organization_department_roles_id: orgDeptRole?.id ?? null,
    organization_id: orgDeptRole?.organization_id ?? null,
    department_id: orgDeptRole?.department_id ?? null,
    role_id: orgDeptRole?.role_id ?? null,
    permissions
  })
}

module.exports = {
  toPermissionDTO,
  toPermissionDTOList,
  toRolePermissionDTO
}
