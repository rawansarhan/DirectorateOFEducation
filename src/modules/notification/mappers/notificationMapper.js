'use strict'

const { NotificationListItemDTO } = require('../dto/NotificationListItemDTO')

function toPlain (row) {
  if (!row) return null
  return typeof row.get === 'function' ? row.get({ plain: true }) : row
}

function toListItemDTO (row) {
  return new NotificationListItemDTO(toPlain(row) || row)
}

function toListItemDTOList (rows = []) {
  return rows.map(row => toListItemDTO(row))
}

module.exports = {
  toListItemDTO,
  toListItemDTOList
}
