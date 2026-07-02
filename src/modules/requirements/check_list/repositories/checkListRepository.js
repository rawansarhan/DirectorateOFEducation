'use strict'

const { Op } = require('sequelize')
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

// جلب مع ترقيم صفحات وبحث. يُرجع { rows, count }.
async function findAndCountActive ({ limit, offset, search } = {}) {
  const where = { is_active: true }

  if (search) {
    const like = { [Op.iLike]: `%${search}%` }
    where[Op.or] = [
      { label: like },
      { id_widget: like }
    ]
  }

  return CheckList.findAndCountAll({
    where,
    order: [['id', 'ASC']],
    limit,
    offset
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
  findAndCountActive,
  create,
  updateInstance
}
