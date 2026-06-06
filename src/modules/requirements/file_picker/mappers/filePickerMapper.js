'use strict'

const { FilePickerOutputDTO } = require('../dto/FilePickerOutputDTO')

function toDTO (row) {
  return new FilePickerOutputDTO(row)
}

function toDTOList (rows = []) {
  return rows.map(row => toDTO(row))
}

module.exports = {
  toDTO,
  toDTOList
}
