'use strict'

function toPlain (row) {
  if (!row) return null
  return typeof row.get === 'function' ? row.get({ plain: true }) : row
}

function mapOrgSummary (org) {
  const plain = toPlain(org)
  if (!plain) return null

  return {
    id: plain.id,
    name: plain.name
  }
}

function mapLocationSummary (location) {
  const plain = toPlain(location)
  if (!plain) return null

  return {
    id: plain.id,
    name: plain.name ?? null,
    typeLocation_id: plain.typeLocation_id ?? null
  }
}

class OrganizationOutputDTO {
  constructor (row) {
    const plain = toPlain(row) || {}

    this.id = plain.id
    this.name = plain.name
    this.parent_id = plain.parent_id ?? null
    this.location_id = plain.location_id ?? null
    this.parent = mapOrgSummary(plain.parent)
    this.location = mapLocationSummary(plain.location)
    this.children = Array.isArray(plain.children)
      ? plain.children.map(mapOrgSummary).filter(Boolean)
      : undefined
    this.created_at = plain.created_at
    this.updated_at = plain.updated_at

    if (this.children === undefined) {
      delete this.children
    }
  }
}

module.exports = {
  OrganizationOutputDTO
}
