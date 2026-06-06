const { DocumentTemplate } = require('../../../../entities')

async function findById (id) {
  return DocumentTemplate.findByPk(id)
}

async function findOneActiveById (id) {
  return DocumentTemplate.findOne({
    where: { id, is_active: true }
  })
}

async function findAllActive () {
  return DocumentTemplate.findAll({
    where: { is_active: true },
    order: [['id', 'DESC']]
  })
}

async function create (data) {
  return DocumentTemplate.create(data)
}

async function updateInstance (template, payload) {
  await template.update(payload)
  return template
}

module.exports = {
  findById,
  findOneActiveById,
  findAllActive,
  create,
  updateInstance
}
