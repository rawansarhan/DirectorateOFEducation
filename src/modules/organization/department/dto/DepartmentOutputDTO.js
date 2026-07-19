'use strict'

function toPlain (row) {
  if (!row) return null
  return typeof row.get === 'function' ? row.get({ plain: true }) : row
}

function mapOrgSummary (org) {
  const plain = toPlain(org)
  if (!plain) return null
  return { id: plain.id, name: plain.name }
}

function mapDeptSummary (dept) {
  const plain = toPlain(dept)
  if (!plain) return null
  return {
    id: plain.id,
    name: plain.name,
    is_active: plain.is_active
  }
}

class DepartmentOutputDTO {
  constructor (row) {
    const plain = toPlain(row) || {}

    this.id = plain.id
    this.name = plain.name
    this.organization_id = plain.organization_id
    this.parent_id = plain.parent_id ?? null
    this.is_active = plain.is_active
    this.organization = mapOrgSummary(plain.organization)
    this.parent = mapDeptSummary(plain.parent)
    this.children = Array.isArray(plain.children)
      ? plain.children.map(mapDeptSummary).filter(Boolean)
      : undefined
    this.created_at = plain.created_at
    this.updated_at = plain.updated_at

    if (this.children === undefined) {
      delete this.children
    }
  }
}

module.exports = {
  DepartmentOutputDTO
}
