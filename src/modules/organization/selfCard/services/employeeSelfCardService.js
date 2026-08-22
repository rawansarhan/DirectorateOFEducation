'use strict'

const {
  ensureSelfCardForUser,
  findSelfCardByUserId
} = require('../repositories/employeeSelfCardRepository')

async function getEmployeeSelfCard (userId) {
  const numericUserId = Number(userId)

  if (!Number.isInteger(numericUserId) || numericUserId < 1) {
    const err = new Error('معرّف الموظف غير صالح')
    err.code = 'VALIDATION_ERROR'
    err.statusCode = 400
    throw err
  }

  let card = await findSelfCardByUserId(numericUserId)

  if (!card) {
    await ensureSelfCardForUser(numericUserId)
    card = await findSelfCardByUserId(numericUserId)
  }

  if (!card) {
    const err = new Error('البطاقة الذاتية غير موجودة')
    err.code = 'NOT_FOUND'
    err.statusCode = 404
    throw err
  }

  const plain = typeof card.get === 'function' ? card.get({ plain: true }) : card

  return {
    message: 'تم جلب البطاقة الذاتية بنجاح',
    data: plain
  }
}

module.exports = {
  getEmployeeSelfCard,
  ensureSelfCardForUser
}
