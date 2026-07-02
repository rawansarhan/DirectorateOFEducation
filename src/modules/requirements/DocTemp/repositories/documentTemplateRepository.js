const { DocumentTemplate, TypeDoc } = require('../../../../entities')

async function findById (id) {
  return DocumentTemplate.findByPk(id)
}

async function findOneActiveById (id) {
  return DocumentTemplate.findOne({
    where: { id, is_active: true },
    include: [
      {
        model: TypeDoc,
        as: 'type_doc',
        attributes: ['id', 'name']
      }
    ]
  })
}

async function findAllActive () {
  return DocumentTemplate.findAll({
    where: { is_active: true },
    include: [
      {
        model: TypeDoc,
        as: 'type_doc',
        attributes: ['id', 'name']
      }
    ],
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
