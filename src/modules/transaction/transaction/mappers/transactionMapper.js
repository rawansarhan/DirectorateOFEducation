'use strict'

const { TransactionOutputDTO } = require('../dto/TransactionOutputDTO')

function toDTO (row) {
  return new TransactionOutputDTO(row)
}

function toDTOList (rows = []) {
  return rows.map(row => toDTO(row))
}

module.exports = {
  toDTO,
  toDTOList
}
