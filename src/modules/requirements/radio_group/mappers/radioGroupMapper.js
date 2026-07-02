'use strict'

const { RadioGroupOutputDTO } = require('../dto/RadioGroupOutputDTO')

function toDTO (row) {
  return new RadioGroupOutputDTO(row)
}

function toDTOList (rows = []) {
  return rows.map(row => toDTO(row))
}

module.exports = {
  toDTO,
  toDTOList
}
