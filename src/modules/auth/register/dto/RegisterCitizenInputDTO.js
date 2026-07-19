'use strict'

class RegisterCitizenInputDTO {
  constructor ({ userName, email, password, phone_number }) {
    this.userName = userName
    this.email = email
    this.password = password
    this.phone_number = phone_number 
  }
}

module.exports = {
  RegisterCitizenInputDTO
}
