'use strict'

const { Op } = require('sequelize')
const { AuthPinSession } = require('../../../../entities')

class AuthPinSessionRepository {
  async invalidateActiveByUserId (userId) {
    return AuthPinSession.update(
      { used_at: new Date() },
      {
        where: {
          user_id: userId,
          used_at: null,
          expires_at: { [Op.gt]: new Date() }
        }
      }
    )
  }

  async create (data) {
    return AuthPinSession.create(data)
  }

  async findById (id, options = {}) {
    return AuthPinSession.findByPk(id, options)
  }

  async markUsed (session, options = {}) {
    return session.update({ used_at: new Date() }, options)
  }
}

module.exports = new AuthPinSessionRepository()
