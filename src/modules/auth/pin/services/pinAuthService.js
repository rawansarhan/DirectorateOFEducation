'use strict'

const userRepository = require('../../shared/repositories/userRepository')
const securityGuardService = require('../../../../core/security/securityGuardService')


const {
  verifyPin,
  hashPin,
} = require('../../shared/services/cryptoAuthService')

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

async function setupPin (userId, pin, clientMeta = {}) {
  await securityGuardService.assertAccountNotLocked(userId)

  const user = await userRepository.findById(userId)

  if (!user || !user.is_active) {
    throw new Error('المستخدم غير موجود أو غير مفعّل')
  }

  if (user.pin_hash) {
    const error = new Error(
      'PIN موجود مسبقاً. استخدم change-pin للتغيير أو delete-pin للحذف'
    )
    error.statusCode = 409
    throw error
  }

  const pinHash = await hashPin(pin)

  await userRepository.updatePinHash(user, pinHash)

  await securityGuardService.recordSuccess({
    userId,
    action: 'PIN_SETUP',
    resourceType: 'user',
    resourceId: userId,
    ipAddress: clientMeta.ip,
    userAgent: clientMeta.userAgent
  })

  return {
    message: 'تم إنشاء رمز PIN بنجاح (يُستخدم كقفل للتطبيق)'
  }
}

async function verifyAppPin (userId, pin, clientMeta = {}) {
  await securityGuardService.assertAccountNotLocked(userId)

  const user = await userRepository.findById(userId)

  if (!user || !user.is_active) {
    throw new Error('المستخدم غير موجود أو غير مفعّل')
  }

  if (!user.pin_hash) {
    throw new Error('لم يتم إعداد PIN بعد')
  }

  const pinValid = await verifyPin(pin, user.pin_hash)

  if (!pinValid) {
    await handleSecurityFailure({
      userId,
      action: 'APP_PIN_VERIFY_FAILED',
      message: 'رمز PIN غير صحيح',
      clientMeta
    })
  }

  await securityGuardService.recordSuccess({
    userId,
    action: 'APP_PIN_VERIFIED',
    resourceType: 'user',
    resourceId: userId,
    ipAddress: clientMeta.ip,
    userAgent: clientMeta.userAgent
  })

  return {
    unlocked: true,
    message: 'تم فتح التطبيق بنجاح'
  }
}

async function changePin (userId, { old_pin, new_pin }, clientMeta = {}) {
  await securityGuardService.assertAccountNotLocked(userId)

  const user = await userRepository.findById(userId)

  if (!user || !user.is_active) {
    throw new Error('المستخدم غير موجود أو غير مفعّل')
  }

  if (!user.pin_hash) {
    throw new Error('لم يتم إعداد PIN بعد. استخدم setup-pin أولاً')
  }

  const oldPinValid = await verifyPin(old_pin, user.pin_hash)

  if (!oldPinValid) {
    await handleSecurityFailure({
      userId,
      action: 'PIN_CHANGE_FAILED',
      message: 'رمز PIN القديم غير صحيح',
      clientMeta
    })
  }

  if (old_pin === new_pin) {
    throw new Error('رمز PIN الجديد يجب أن يكون مختلفاً عن القديم')
  }

  const pinHash = await hashPin(new_pin)

  await userRepository.updatePinHash(user, pinHash)

  await securityGuardService.recordSuccess({
    userId,
    action: 'PIN_CHANGED',
    resourceType: 'user',
    resourceId: userId,
    ipAddress: clientMeta.ip,
    userAgent: clientMeta.userAgent
  })

  return {
    message: 'تم تغيير رمز PIN بنجاح'
  }
}

async function deletePin (userId, pin, clientMeta = {}) {
  await securityGuardService.assertAccountNotLocked(userId)

  const user = await userRepository.findById(userId)

  if (!user || !user.is_active) {
    throw new Error('المستخدم غير موجود أو غير مفعّل')
  }

  if (!user.pin_hash) {
    throw new Error('لا يوجد PIN لحذفه')
  }

  const pinValid = await verifyPin(pin, user.pin_hash)

  if (!pinValid) {
    await handleSecurityFailure({
      userId,
      action: 'PIN_DELETE_FAILED',
      message: 'رمز PIN غير صحيح',
      clientMeta
    })
  }

  await userRepository.clearPinHash(user)

  await securityGuardService.recordSuccess({
    userId,
    action: 'PIN_DELETED',
    resourceType: 'user',
    resourceId: userId,
    ipAddress: clientMeta.ip,
    userAgent: clientMeta.userAgent
  })

  return {
    message: 'تم حذف رمز PIN بنجاح'
  }
}

module.exports = {
  setupPin,
  verifyAppPin,
  changePin,
  deletePin,
  changeCitizenPin: changePin,
}
