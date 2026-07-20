'use strict'

const { AuthChallenge } = require('../../../../entities')

class AuthChallengeRepository {
  getSequelize () {
    return AuthChallenge.sequelize
  }

  async invalidateByPinSessionId (pinSessionId) {
    return AuthChallenge.update(
      { used_at: new Date() },
      {
        where: {
          pin_session_id: pinSessionId,
          used_at: null
        }
      }
    )
  }

  async create (data) {
    return AuthChallenge.create(data)
  }

  async findById (id) {
    return AuthChallenge.findByPk(id)
  }

  async findByIdWithLock (id, transaction) {
    return AuthChallenge.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE
    })
  }

  async markUsed (challenge, transaction) {
    return challenge.update({ used_at: new Date() }, { transaction })
  }
}

module.exports = new AuthChallengeRepository()
