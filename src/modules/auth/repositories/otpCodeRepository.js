const { OtpCode } = require('../../../entities')

async function findBySessionId(sessionId) {
  return OtpCode.findOne({ where: { session_id: sessionId } })
}

async function create(data) {
  return OtpCode.create(data)
}

async function destroyByUserId(userId, options = {}) {
  return OtpCode.destroy({ where: { user_id: userId }, ...options })
}

async function destroyInstance(otpRecord) {
  return otpRecord.destroy()
}

module.exports = {
  findBySessionId,
  create,
  destroyByUserId,
  deleteByUserId: destroyByUserId,
  destroyInstance
}
