'use strict'

const { User } = require('../../../entities')

class UserRepository {
  getSequelize () {
    return User.sequelize
  }

  async findByEmail (email, options = {}) {
    return User.findOne({
      where: { email },
      ...options
    })
  }

  async findByUserName (userName, options = {}) {
    return User.findOne({
      where: { userName },
      ...options
    })
  }

  async findActiveByUserName (userName) {
    return User.findOne({
      where: {
        userName,
        is_active: true
      }
    })
  }

  async findById (id, options = {}) {
    return User.findByPk(id, options)
  }

  async create (data, options = {}) {
    return User.create(data, options)
  }

  async update (user, data, options = {}) {
    return user.update(data, options)
  }

  async activate (user, options = {}) {
    return user.update({ is_active: true }, options)
  }

  async updatePinHash (user, pinHash, options = {}) {
    return user.update({ pin_hash: pinHash }, options)
  }

  async resetSecurityLock (user) {
    return user.update({
      security_failed_attempts: 0,
      security_locked_until: null
    })
  }

  async resetSecurityLockById (userId) {
    const user = await this.findById(userId)

    if (!user) {
      return null
    }

    return this.resetSecurityLock(user)
  }

  async updateSecurityState (user, data) {
    return user.update(data)
  }
}

module.exports = new UserRepository()
