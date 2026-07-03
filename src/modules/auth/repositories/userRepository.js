'use strict'

const { Op } = require('sequelize')
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

  async findByNationalId (nationalId, options = {}) {
    return User.findOne({
      where: { national_id: nationalId },
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

  // كل المستخدمين الذين يتعارضون بنفس البريد أو اسم المستخدم (يُرجع مصفوفة)
  async findConflictingByEmailOrUserName (email, userName, options = {}) {
    return User.findAll({
      where: {
        [Op.or]: [{ email }, { userName }]
      },
      ...options
    })
  }

  async create (data, options = {}) {
    return User.create(data, options)
  }

  async update (user, data, options = {}) {
    return user.update(data, options)
  }

  // تحديث مستخدم عبر المعرّف؛ يُرجع المستخدم المحدّث أو null إن لم يوجد
  async updateById (id, data, options = {}) {
    const user = await this.findById(id, options)

    if (!user) {
      return null
    }

    return user.update(data, options)
  }

  async destroyInstance (user, options = {}) {
    return user.destroy(options)
  }

  async activate (user, options = {}) {
    return user.update({ is_active: true }, options)
  }

  async updatePinHash (user, pinHash, options = {}) {
    return user.update({ pin_hash: pinHash }, options)
  }

  async clearPinHash (user, options = {}) {
    return user.update({ pin_hash: null }, options)
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
