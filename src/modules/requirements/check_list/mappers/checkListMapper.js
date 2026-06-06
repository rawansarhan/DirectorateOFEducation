'use strict'

const { CheckListOutputDTO } = require('../dto/CheckListOutputDTO')

function toDTO (row) {
  return new CheckListOutputDTO(row)
}

function toDTOList (rows = []) {
  return rows.map(row => toDTO(row))
}

module.exports = {
  toDTO,
  toDTOList
}
