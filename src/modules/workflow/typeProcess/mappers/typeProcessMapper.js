'use strict'

const {
  TypeProcessOutputDTO
} = require('../dto/TypeProcessOutputDTO')

class TypeProcessMapper {

  toDTO(typeProcess) {

    return new TypeProcessOutputDTO(
      typeProcess
    )
  }
}

module.exports =
  new TypeProcessMapper()