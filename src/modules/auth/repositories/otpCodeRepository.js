'use strict'

const { OtpCode } = require('../../../entities')

class OtpCodeRepository {
  async deleteByUserId (userId) {
    return OtpCode.destroy({ where: { user_id: userId } })
  }

  async create (data) {
    return OtpCode.create(data)
  }

  async findBySessionId (sessionId) {
    return OtpCode.findOne({ where: { session_id: sessionId } })
  }

  async destroy (record) {
    return record.destroy()
  }
}

module.exports = new OtpCodeRepository()
