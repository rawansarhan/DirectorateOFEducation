'use strict'

class FileInputDTO {
  constructor ({ file_name, file_type, type }) {
    this.file_name = file_name
    this.file_type = file_type
    this.type = type 
  }
}

module.exports = {
  FileInputDTO
}
