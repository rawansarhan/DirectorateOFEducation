'use strict'


class FileOutputDTO {
  constructor (file) {
    const plain =
      file && typeof file.get === 'function'
        ? file.get({ plain: true })
        : file

    this.id = plain?.id
    this.file_name = plain?.file_name
    this.file_type = plain?.file_type
    this.type = plain?.type
    this.created_at = plain?.created_at
    this.updated_at = plain?.updated_at
  }
}

module.exports = {
  FileOutputDTO
}
