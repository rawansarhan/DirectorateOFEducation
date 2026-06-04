const { Location, TypeLocation } = require('../../../entities')

async function findById(id) {
  return Location.findByPk(id)
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

module.exports = {
  findById,
  findAll
}
