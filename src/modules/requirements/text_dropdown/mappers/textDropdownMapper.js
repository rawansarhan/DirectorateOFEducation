'use strict'

const { TextDropdownOutputDTO } = require('../dto/TextDropdownOutputDTO')

function toDTO (row) {
  return new TextDropdownOutputDTO(row)
}

function toDTOList (rows = []) {
  return rows.map(row => toDTO(row))
}

module.exports = {
  toDTO,
  toDTOList
}
