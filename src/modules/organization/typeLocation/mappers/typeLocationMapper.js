'use strict'

const { TypeLocationInputDTO } = require('../dto/TypeLocationInputDTO')
const { TypeLocationOutputDTO } = require('../dto/TypeLocationOutputDTO')

function toCreateInput (data) {
  return new TypeLocationInputDTO(data)
}

function toCreatePayload (input) {
  return {
    name: input.name
  }
}

function toDTO (row) {
  return new TypeLocationOutputDTO(row)
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
