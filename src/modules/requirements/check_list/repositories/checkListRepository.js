'use strict'

const { CheckList } = require('../../../../entities')

async function findById (id) {
  return CheckList.findOne({
    where: { id, is_active: true }
  })
}

async function findByIdWidget (idWidget) {
  return CheckList.findOne({
    where: { id_widget: idWidget, is_active: true }
  })
}

async function findAllActive () {
  return CheckList.findAll({
    where: { is_active: true },
    order: [['id', 'ASC']]
  })
}

async function create (data) {
  return CheckList.create(data)
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
