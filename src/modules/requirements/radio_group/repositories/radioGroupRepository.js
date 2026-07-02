'use strict'

const { RadioGroup } = require('../../../../entities')

async function findById (id) {
  return RadioGroup.findOne({
    where: { id, is_active: true }
  })
}

async function findByIdWidget (idWidget) {
  return RadioGroup.findOne({
    where: { id_widget: idWidget, is_active: true }
  })
}

async function findAllActive () {
  return RadioGroup.findAll({
    where: { is_active: true },
    order: [['id', 'ASC']]
  })
}

async function create (data) {
  return RadioGroup.create(data)
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
