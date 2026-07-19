'use strict'

const { LocationInputDTO } = require('../dto/LocationInputDTO')
const { LocationOutputDTO } = require('../dto/LocationOutputDTO')

function toCreateInput (data) {
  return new LocationInputDTO(data)
}

function toCreatePayload (input) {
  return {
    name: input.name,
    typeLocation_id: input.typeLocation_id,
    parent_id: input.parent_id ?? null
  }
}

function toDTO (row) {
  return new LocationOutputDTO(row)
}

function toDTOList (rows = []) {
  return rows.map(row => toDTO(row))
}

module.exports = {
  toCreateInput,
  toCreatePayload,
  toDTO,
  toDTOList
}
