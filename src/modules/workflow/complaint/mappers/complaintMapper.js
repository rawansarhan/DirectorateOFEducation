'use strict'

const {
  toAuthProcessResponse
} = require('../../processDefinition/mappers/processMapper')
const { ComplaintProcessOutputDTO } = require('../dto/ComplaintProcessOutputDTO')

function toDTO (row) {
  return new ComplaintProcessOutputDTO(toAuthProcessResponse(row))
}

function toDTOList (rows = []) {
  return rows.map(row => toDTO(row))
}

module.exports = {
  toDTO,
  toDTOList,
  toAuthProcessResponse
}
