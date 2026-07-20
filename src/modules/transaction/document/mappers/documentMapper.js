'use strict'

const { DocumentUploadInputDTO } = require('../dto/DocumentUploadInputDTO')
const { DocumentUploadOutputDTO } = require('../dto/DocumentUploadOutputDTO')

function toUploadInput (data) {
  return new DocumentUploadInputDTO(data)
}

function toUploadOutputDTO (payload) {
  return new DocumentUploadOutputDTO(payload)
}

module.exports = {
  toUploadInput,
  toUploadOutputDTO
}
