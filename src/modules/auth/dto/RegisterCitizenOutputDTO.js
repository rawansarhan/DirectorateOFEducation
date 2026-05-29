'use strict'


class RegisterCitizenOutputDTO {
  constructor (field) {
    const plain =
      field && typeof field.get === 'function'
        ? field.get({ plain: true })
        : field

    this.id = plain?.id
    this.userName = plain?.userName
    this.email = plain?.email
    this.phone_number = plain?.phone_number
    this.created_at = plain?.created_at
    this.updated_at = plain?.updated_at
  }
}

module.exports = {
  RegisterCitizenOutputDTO
}
