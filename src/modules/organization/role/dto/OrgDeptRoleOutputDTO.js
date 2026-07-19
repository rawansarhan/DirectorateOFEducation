'use strict'

function toPlain (row) {
  if (!row) return null
  return typeof row.get === 'function' ? row.get({ plain: true }) : row
}

function mapRoleSummary (role) {
  const plain = toPlain(role)
  if (!plain) return null
  return {
    id: plain.id,
    name: plain.name,
    code: plain.code
  }
}

function mapOrgSummary (org) {
  const plain = toPlain(org)
  if (!plain) return null
  return { id: plain.id, name: plain.name }
}

function mapDeptSummary (dept) {
  const plain = toPlain(dept)
  if (!plain) return null
  return { id: plain.id, name: plain.name }
}

function mapOrgDeptRoleSummary (odr) {
  const plain = toPlain(odr)
  if (!plain) return null
  return {
    id: plain.id,
    role_id: plain.role_id,
    organization_id: plain.organization_id,
    department_id: plain.department_id,
    is_active: plain.is_active,
    camunda_group_key: plain.camunda_group_key ?? null
  }
}

class OrgDeptRoleOutputDTO {
  constructor (row) {
    const plain = toPlain(row) || {}

    this.id = plain.id
    this.role_id = plain.role_id
    this.organization_id = plain.organization_id
    this.department_id = plain.department_id
    this.parent_id = plain.parent_id ?? null
    this.is_active = plain.is_active
    this.camunda_group_key = plain.camunda_group_key ?? null
    this.role = mapRoleSummary(plain.role)
    this.organization = mapOrgSummary(plain.organization)
    this.department = mapDeptSummary(plain.department)
    this.parent = mapOrgDeptRoleSummary(plain.parent)
    this.children = Array.isArray(plain.children)
      ? plain.children.map(mapOrgDeptRoleSummary).filter(Boolean)
      : undefined
    this.created_at = plain.created_at
    this.updated_at = plain.updated_at

    if (this.children === undefined) {
      delete this.children
    }
  }
}

module.exports = {
  OrgDeptRoleOutputDTO
}
