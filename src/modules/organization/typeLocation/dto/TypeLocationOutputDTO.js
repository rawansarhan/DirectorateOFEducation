'use strict'

function toPlain (row) {
  if (!row) return {}
  return typeof row.get === 'function' ? row.get({ plain: true }) : row
}

class TypeLocationOutputDTO {
  constructor (row) {
    const plain = toPlain(row)

    this.id = plain.id
    this.name = plain.name
  }
}

module.exports = { TypeLocationOutputDTO }
