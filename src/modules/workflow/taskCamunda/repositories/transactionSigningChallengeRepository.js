'use strict'

const { TransactionSigningChallenge } = require('../../../../entities')

class TransactionSigningChallengeRepository {
  getSequelize () {
    return TransactionSigningChallenge.sequelize
  }

  async invalidateActiveByTaskAndUser (taskId, userId) {
    return TransactionSigningChallenge.update(
      { used_at: new Date() },
      {
        where: {
          task_id: taskId,
          user_id: userId,
          used_at: null
        }
      }
    )
  }

  async create (data) {
    return TransactionSigningChallenge.create(data)
  }

  async findByIdWithLock (id, transaction) {
    return TransactionSigningChallenge.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE
    })
  }

  async markUsed (challenge, transaction) {
    return challenge.update({ used_at: new Date() }, { transaction })
  }
}

module.exports = new TransactionSigningChallengeRepository()
