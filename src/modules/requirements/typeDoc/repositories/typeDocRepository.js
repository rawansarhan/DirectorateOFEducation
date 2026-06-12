'use strict'

const { TypeDoc } = require('../../../../entities')

class TypeDocRepository {
  async create (data, options = {}) {
    return TypeDoc.create(data, options)
  }

  async findById (id) {
    return TypeDoc.findByPk(id)
  }

  async findByName (name) {
    return TypeDoc.findOne({ where: { name } })
  }

  async findAllActive () {
    return TypeDoc.findAll({
      where: { is_active: true },
      order: [['name', 'ASC']]
    })
  }

  async update (instance, data, options = {}) {
    return instance.update(data, options)
  }

  async findOrCreateByName (name, options = {}) {
    const [row] = await TypeDoc.findOrCreate({
      where: { name },
      defaults: {
        name,
        is_active: true
      },
      ...options
    })

    return row
  }
}

module.exports = new TypeDocRepository()
