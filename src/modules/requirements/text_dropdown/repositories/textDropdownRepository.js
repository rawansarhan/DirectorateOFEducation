'use strict'

const { TextDropdown } = require('../../../../entities')

async function findById (id) {
  return TextDropdown.findOne({
    where: { id, is_active: true }
  })
}

async function findByIdWidget (idWidget) {
  return TextDropdown.findOne({
    where: { id_widget: idWidget, is_active: true }
  })
}

async function findAllActive () {
  return TextDropdown.findAll({
    where: { is_active: true },
    order: [['id', 'ASC']]
  })
}

async function create (data) {
  return TextDropdown.create(data)
}

async function updateInstance (row, payload) {
  await row.update(payload)
  return row.reload()
}

module.exports = {
  findById,
  findByIdWidget,
  findAllActive,
  create,
  updateInstance
}
