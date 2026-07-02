'use strict'

const { DocumentTemplateOutputDTO } = require('../dto/DocumentTemplateOutputDTO')

function toDTO (row) {
  return new DocumentTemplateOutputDTO(row)
}

function toDTOList (rows = []) {
  return rows.map(row => toDTO(row))
}

module.exports = {
  toDTO,
  toDTOList
}
