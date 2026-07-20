'use strict'

class LoginInputDTO {
  constructor ({ userName, password }) {
    this.userName = userName
    this.password = password
  }
}

module.exports = {
  LoginInputDTO
}
