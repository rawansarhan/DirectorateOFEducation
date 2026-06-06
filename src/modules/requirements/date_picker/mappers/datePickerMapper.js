'use strict'

const { DatePickerOutputDTO } = require('../dto/DatePickerOutputDTO')

function toDTO (row) {
  return new DatePickerOutputDTO(row)
}

function toDTOList (rows = []) {
  return rows.map(row => toDTO(row))
}

module.exports = {
  toDTO,
  toDTOList
}
