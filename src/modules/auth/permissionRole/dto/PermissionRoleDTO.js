'use strict'

class PermissionOutputDTO {
  constructor (row = {}) {
    this.id = row.id ?? null
    this.name = row.name ?? null
    this.created_at = row.created_at ?? null
    this.updated_at = row.updated_at ?? null
  }
}

class RolePermissionOutputDTO {
  constructor ({
    organization_department_roles_id,
    organization_id,
    department_id,
    role_id,
    permissions = []
  } = {}) {
    this.organization_department_roles_id =
      organization_department_roles_id ?? null
    this.organization_id = organization_id ?? null
    this.department_id = department_id ?? null
    this.role_id = role_id ?? null
    this.permissions = permissions.map(item => ({
      id: item.id ?? item.permission_id ?? null,
      name: item.name ?? null
    }))
  }
}

module.exports = {
  PermissionOutputDTO,
  RolePermissionOutputDTO
}
