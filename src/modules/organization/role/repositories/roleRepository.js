const { Role } = require('../../../../entities')

async function findByCode(code, options = {}) {
  return Role.findOne({ where: { code }, ...options })
}

async function findById(id, options = {}) {
  return Role.findByPk(id, options)
}

/** كل الأدوار المعرّفة في النظام، مرتّبة بالاسم — مصدر قائمة اختيار الدور. */
async function findAllRoles() {
  return Role.findAll({
    attributes: ['id', 'name', 'code'],
    order: [['name', 'ASC']]
  })
}

async function create(data, options = {}) {
  return Role.create(data, options)
}

module.exports = {
  findByCode,
  findById,
  findAllRoles,
  create
}
