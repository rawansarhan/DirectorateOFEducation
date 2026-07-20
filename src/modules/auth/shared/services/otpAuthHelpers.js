'use strict'

const { v4: uuidv4 } = require('uuid')

const otpCodeRepository = require('../repositories/otpCodeRepository')
const securityGuardService = require('../../../../core/security/securityGuardService')
const { sendSms } = require('./smsService')

const OTP_TTL_MINUTES = 5

function generateOtp () {
  return '123456'
}

async function handleSecurityFailure ({
  userId,
  action,
  message,
  clientMeta = {},
  resourceType = 'user',
  resourceId = userId
}) {
  const failure = await securityGuardService.recordFailure({
    userId,
    action,
    resourceType,
    resourceId,
    ipAddress: clientMeta.ip,
    userAgent: clientMeta.userAgent,
    details: { message }
  })

  if (failure.locked) {
    const error = new Error('الحساب مقفل مؤقتاً بسبب محاولات فاشلة متكررة')
    error.code = 'ACCOUNT_LOCKED'
    error.lockedUntil = failure.lockedUntil
    throw error
  }

  const error = new Error(message)
  error.remainingAttempts = failure.remainingAttempts

  throw error
}

async function saveAndSendOtp (userId, phone) {
  await otpCodeRepository.destroyByUserId(userId)

  const otp = generateOtp()
  const session_id = uuidv4()

  const expires_at = new Date(
    Date.now() + OTP_TTL_MINUTES * 60 * 1000
  )

  await otpCodeRepository.create({
    session_id,
    otp,
    phone_number: phone,
    user_id: userId,
    expires_at,
  })

  await sendSms(
    phone,
    `رمز التحقق : ${otp}\nصالح لمدة ${OTP_TTL_MINUTES} دقائق فقط.`
  )

  return session_id
}

module.exports = {
  OTP_TTL_MINUTES,
  generateOtp,
  handleSecurityFailure,
  saveAndSendOtp,
}
