'use strict'

class RegisterEmpInputDTO {
  constructor ({ userName, email, password, phone_number, is_active}) {
    this.userName = userName
    this.email = email
    this.password = password
    this.phone_number = phone_number 
    this.is_active = is_active
  }
}

module.exports = {
  RegisterEmpInputDTO
}
