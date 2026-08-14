const { DocumentTemplate, TypeDoc } = require('../../../../entities')
const { likeContains } = require('../../../../core/utils/escapeLike')

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

// جلب مع ترقيم صفحات وبحث (على اسم القالب). يُرجع { rows, count }.
async function findAndCountActive ({ limit, offset, search } = {}) {
  const where = { is_active: true }

  if (search) {
    where.name = likeContains(search)
  }

  return DocumentTemplate.findAndCountAll({
    where,
    include: [
      {
        model: TypeDoc,
        as: 'type_doc',
        attributes: ['id', 'name']
      }
    ],
    order: [['id', 'DESC']],
    limit,
    offset,
    distinct: true
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
  findAndCountActive,
  create,
  updateInstance
}
