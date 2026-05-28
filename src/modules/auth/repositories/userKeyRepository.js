'use strict'

const { UserKey } = require('../../../entities')

class UserKeyRepository {
  async create (data, options = {}) {
    return UserKey.create(data, options)
  }

  async findActiveLatestByUserId (userId, options = {}) {
    return UserKey.findOne({
      where: {
        user_id: userId,
        is_active: true
      },
      order: [['created_at', 'DESC']],
      ...options
    })
  }

  async findById (id, options = {}) {
    return UserKey.findByPk(id, options)
  }
}

module.exports = new UserKeyRepository()
