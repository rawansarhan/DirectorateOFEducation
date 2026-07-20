const { Role } = require('../../../../entities')

async function findByCode(code, options = {}) {
  return Role.findOne({ where: { code }, ...options })
}

async function create(data, options = {}) {
  return Role.create(data, options)
}

module.exports = {
  findByCode,
  create
}
