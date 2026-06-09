'use strict'

const IDENTITY_KEYS = [
  'first_name',
  'last_name',
  'father_name',
  'mother_name',
  'national_id'
]

class TransactionDraftInputDTO {
  constructor (data = {}) {
    this.identity = {}
    this.data = { ...data }

    for (const key of IDENTITY_KEYS) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const value = data[key]
        this.identity[key] = value === '' ? null : value
        delete this.data[key]
      }
    }
  }

  getIdentityUpdatePayload () {
    if (Object.keys(this.identity).length === 0) {
      return {}
    }

    return { ...this.identity }
  }
}

module.exports = {
  TransactionDraftInputDTO,
  IDENTITY_KEYS
}
