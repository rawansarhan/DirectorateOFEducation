'use strict'

const { OrganizationInputDTO } = require('../dto/OrganizationInputDTO')
const { OrganizationUpdateInputDTO } = require('../dto/OrganizationUpdateInputDTO')
const { OrganizationOutputDTO } = require('../dto/OrganizationOutputDTO')

function toCreateInput (data) {
  return new OrganizationInputDTO(data)
}

function toUpdateInput (data) {
  return new OrganizationUpdateInputDTO(data)
}

function toCreatePayload (input) {
  return {
    name: input.name,
    parent_id: input.parent_id ?? null,
    location_id: input.location_id ?? null
  }
}

function toUpdatePayload (input) {
  const payload = {}
  if (input.name !== undefined) payload.name = input.name
  if (input.parent_id !== undefined) payload.parent_id = input.parent_id
  if (input.location_id !== undefined) payload.location_id = input.location_id
  return payload
}

function toDTO (row) {
  return new OrganizationOutputDTO(row)
}

function toDTOList (rows = []) {
  return rows.map(row => toDTO(row))
}

module.exports = {
  toCreateInput,
  toUpdateInput,
  toCreatePayload,
  toUpdatePayload,
  toDTO,
  toDTOList
}
