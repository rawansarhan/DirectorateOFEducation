'use strict'

const { DatePicker } = require('../../../../entities')

async function findById (id) {
  return DatePicker.findOne({
    where: { id, is_active: true }
  })
}

async function findByIdWidget (idWidget) {
  return DatePicker.findOne({
    where: { id_widget: idWidget, is_active: true }
  })
}

async function findAllActive () {
  return DatePicker.findAll({
    where: { is_active: true },
    order: [['id', 'ASC']]
  })
}

async function create (data) {
  return DatePicker.create(data)
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
