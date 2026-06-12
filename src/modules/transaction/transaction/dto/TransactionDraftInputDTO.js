'use strict'

const { IDENTITY_KEYS } = require('../validations/transactionValidations')

class TransactionIdentityInputDTO {
  constructor (data = {}) {
    this.identity = {}

    for (const key of IDENTITY_KEYS) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        this.identity[key] = data[key]
      }
    }
  }

  getIdentityUpdatePayload () {
    return { ...this.identity }
  }
}

module.exports = {
  TransactionIdentityInputDTO,
  IDENTITY_KEYS
}
