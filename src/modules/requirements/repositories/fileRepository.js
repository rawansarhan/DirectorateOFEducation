const { File } = require('../../../entities')

async function findById(id) {
  return File.findByPk(id)
}

async function findOneActiveById(id) {
  return File.findOne({
    where: { id, is_active: true }
  })
}

async function findAllActive() {
  return File.findAll({
    where: { is_active: true },
    order: [['id', 'ASC']]
  })
}

async function create(data) {
  return File.create(data)
}

async function updateInstance(file, payload) {
  await file.update(payload)
  return file
}

module.exports = {
  findById,
  findOneActiveById,
  findAllActive,
  create,
  updateInstance
}
