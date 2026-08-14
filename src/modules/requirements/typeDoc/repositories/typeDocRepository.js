'use strict'

const { TypeDoc } = require('../../../../entities')
const { likeContains } = require('../../../../core/utils/escapeLike')

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

  // جلب مع ترقيم صفحات وبحث. يُرجع { rows, count }.
  async findAndCountActive ({ limit, offset, search } = {}) {
    const where = { is_active: true }

    if (search) {
      where.name = likeContains(search)
    }

    return TypeDoc.findAndCountAll({
      where,
      order: [['name', 'ASC']],
      limit,
      offset
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
