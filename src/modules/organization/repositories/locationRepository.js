const { Location, TypeLocation } = require('../../../entities')

async function findById(id) {
  return Location.findByPk(id)
}

async function findTypeLocationById(id) {
  return TypeLocation.findByPk(id)
}

async function findAll() {
  return Location.findAll({
    order: [['id', 'ASC']],
    include: [
      { model: TypeLocation, as: 'type_location' },
      { model: Location, as: 'parent' }
    ]
  })
}

async function create(data) {
  return Location.create(data)
}

async function findByIdWithRelations(id) {
  return Location.findByPk(id, {
    include: [
      { model: TypeLocation, as: 'type_location' },
      { model: Location, as: 'parent' }
    ]
  })
}

module.exports = {
  findById,
  findTypeLocationById,
  findAll,
  findByIdWithRelations,
  create
}
