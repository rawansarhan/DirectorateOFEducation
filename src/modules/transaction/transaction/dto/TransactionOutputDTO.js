'use strict'

class TransactionOutputDTO {
  constructor (row) {
    const plain =
      row && typeof row.get === 'function'
        ? row.get({ plain: true })
        : row

    this.id = plain?.id
    this.code = plain?.code
    this.user_id = plain?.user_id
    this.status = plain?.status
    this.data = plain?.data ?? {}
    this.version = plain?.version
    this.is_active = plain?.is_active
    this.created_at = plain?.created_at
    this.updated_at = plain?.updated_at
  }
}

module.exports = {
  TransactionOutputDTO
}
