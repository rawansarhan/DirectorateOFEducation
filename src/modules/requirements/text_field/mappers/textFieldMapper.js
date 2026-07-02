'use strict'

const { TextFieldOutputDTO } = require('../dto/TextFieldOutputDTO')

function toDTO (row) {
  return new TextFieldOutputDTO(row)
}

function toDTOList (rows = []) {
  return rows.map(row => toDTO(row))
}

module.exports = {
  toDTO,
  toDTOList
}
