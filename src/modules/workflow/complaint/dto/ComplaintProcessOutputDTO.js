'use strict'

class ComplaintProcessOutputDTO {
  constructor (row) {
    const plain =
      row && typeof row.get === 'function'
        ? row.get({ plain: true })
        : row

    this.id = plain?.id
    this.name = plain?.name
    this.code = plain?.code
    this.status = plain?.status
    this.is_active = plain?.is_active
    this.approval_status = plain?.approval_status
    this.type_trans_id = plain?.type_trans_id
  }
}

module.exports = {
  ComplaintProcessOutputDTO
}
