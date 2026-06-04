const { Organization, Location } = require('../../../entities')

async function findById(id) {
  return Organization.findByPk(id)
}

async function findByIdWithRelations(id) {
  return Organization.findByPk(id, {
    include: [
      { model: Organization, as: 'parent' },
      { model: Organization, as: 'children' },
      { model: Location, as: 'location' }
    ]
  })
}

async function findAll() {
  return Organization.findAll({
    order: [['id', 'ASC']],
    include: [
      { model: Organization, as: 'parent' },
      { model: Location, as: 'location' }
    ]
  })
}

async function create(data) {
  return Organization.create(data)
}

async function updateInstance(organization, payload) {
  await organization.update(payload)
  await organization.reload()
  return organization
}

async function destroyInstance(organization) {
  return organization.destroy()
}

module.exports = {
  findById,
  findByIdWithRelations,
  findAll,
  create,
  updateInstance,
  destroyInstance
}
