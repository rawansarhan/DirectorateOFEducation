'use strict'

const { FilePicker } = require('../../../../entities')

async function findById (id) {
  return FilePicker.findOne({
    where: { id, is_active: true }
  })
}

async function findByIdWidget (idWidget) {
  return FilePicker.findOne({
    where: { id_widget: idWidget, is_active: true }
  })
}

async function findAllActive () {
  return FilePicker.findAll({
    where: { is_active: true },
    order: [['id', 'ASC']]
  })
}

async function create (data) {
  return FilePicker.create(data)
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
