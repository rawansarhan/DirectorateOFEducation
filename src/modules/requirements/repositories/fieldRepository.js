const { Field } = require('../../../entities')

async function findById(id) {
  return Field.findByPk(id)
}

async function findOneActiveById(id) {
  return Field.findOne({
    where: { id, is_active: true }
  })
}

async function findAllActive() {
  return Field.findAll({
    where: { is_active: true },
    order: [['id', 'ASC']]
  })
}

async function create(data) {
  return Field.create(data)
}

async function updateInstance(field, payload) {
  await field.update(payload)
  return field
}

module.exports = {
  findById,
  findOneActiveById,
  findAllActive,
  create,
  updateInstance
}
