'use strict'

function toPlain (row) {
  if (!row) return null
  return typeof row.get === 'function' ? row.get({ plain: true }) : row
}

function mapLocationSummary (location) {
  const plain = toPlain(location)
  if (!plain) return null

  return {
    id: plain.id,
    name: plain.name
  }
}

function mapTypeLocationSummary (typeLocation) {
  const plain = toPlain(typeLocation)
  if (!plain) return null

  return {
    id: plain.id,
    name: plain.name ?? null
  }
}

class LocationOutputDTO {
  constructor (row) {
    const plain = toPlain(row) || {}

    this.id = plain.id
    this.name = plain.name
    this.typeLocation_id = plain.typeLocation_id
    this.parent_id = plain.parent_id ?? null
    this.type_location = mapTypeLocationSummary(plain.type_location)
    this.parent = mapLocationSummary(plain.parent)
    this.created_at = plain.created_at
    this.updated_at = plain.updated_at
  }
}

module.exports = {
  LocationOutputDTO
}
