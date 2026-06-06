'use strict'

function validateComplaintUserId (userId) {
  const numericId = Number(userId)

  if (!Number.isInteger(numericId) || numericId < 1) {
    throw new Error('معرّف المستخدم غير صالح')
  }

  return numericId
}

module.exports = {
  validateComplaintUserId
}
