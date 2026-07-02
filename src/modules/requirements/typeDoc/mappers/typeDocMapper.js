'use strict'

const { TypeDocOutputDTO } = require('../dto/TypeDocOutputDTO')

function toDTO (row) {
  return new TypeDocOutputDTO(row)
}

module.exports = {
  toDTO
}
