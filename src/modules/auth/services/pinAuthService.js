'use strict'

const { v4: uuidv4 } = require('uuid')

const userRepository = require('../repositories/userRepository')
const userRoleAssignmentRepository = require('../repositories/userRoleAssignmentRepository')
const userKeyRepository = require('../repositories/userKeyRepository')
const authPinSessionRepository = require('../repositories/authPinSessionRepository')
const authChallengeRepository = require('../repositories/authChallengeRepository')
const securityGuardService = require('../../../core/security/securityGuardService')
const tokenService = require('./tokenService')

const { LoginOutputDTO } = require('../dto/LoginOutputDTO')

const {
  verifyPin,
  hashPin,
  generateNonce,
  buildChallengeMessage,
  verifyChallengeSignature,
  hashValue,
  getChallengeExpiresAt,
  getPinSessionExpiresAt,
  CHALLENGE_TTL_MS,
  PIN_SESSION_TTL_MS
} = require('./cryptoAuthService')

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

async function getUserAssignments (userId) {
  return userRoleAssignmentRepository.findActiveWithOrgDeptRole(userId)
}

async function isCitizenUser (userId) {
  const assignments = await getUserAssignments(userId)

  return assignments.some(item =>
    item.org_department_role?.camunda_group_key === 'CITIZEN'
  )
}

async function isEmployeeUser (userId) {
  const assignments = await getUserAssignments(userId)

  return assignments.some(item => {
    const key = item.org_department_role?.camunda_group_key
    return key && key !== 'CITIZEN'
  })
}

async function buildAuthResponse (user, clientMeta = {}) {
  const roleAssign = await userRoleAssignmentRepository.findActiveRolesByUserId(
    user.id
  )

  const { accessToken, refreshToken } = await tokenService.issueTokens(
    user.id,
    clientMeta
  )

  return {
    token: accessToken,
    refreshToken,
    user: new LoginOutputDTO(user),
    roles: roleAssign.map(item => item.organization_department_roles_id)
  }
}

async function setupPin (userId, pin, clientMeta = {}) {
  await securityGuardService.assertAccountNotLocked(userId)

  const user = await userRepository.findById(userId)

  if (!user || !user.is_active) {
    throw new Error('المستخدم غير موجود أو غير مفعّل')
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

async function employeeVerifyPin ({ userName, pin, clientMeta = {} }) {
  const user = await userRepository.findActiveByUserName(userName)

  if (!user) {
    await securityGuardService.recordFailure({
      userId: null,
      action: 'EMPLOYEE_PIN_VERIFY_FAILED',
      resourceType: 'auth',
      resourceId: userName,
      ipAddress: clientMeta.ip,
      userAgent: clientMeta.userAgent,
      details: { reason: 'user_not_found' }
    })
    throw new Error('بيانات الدخول غير صحيحة')
  }

  await securityGuardService.assertAccountNotLocked(user.id)

  const employee = await isEmployeeUser(user.id)

  if (!employee) {
    throw new Error('هذا الحساب ليس حساب موظف')
  }

  const pinValid = await verifyPin(pin, user.pin_hash)

  if (!pinValid) {
    await handleSecurityFailure({
      userId: user.id,
      action: 'EMPLOYEE_PIN_VERIFY_FAILED',
      message: 'رمز PIN غير صحيح',
      clientMeta,
      resourceType: 'auth',
      resourceId: user.id
    })
  }

  const userKey = await userKeyRepository.findActiveLatestByUserId(user.id)

  if (!userKey) {
    throw new Error('لا يوجد مفتاح رقمي مرتبط بهذا الموظف')
  }

  await authPinSessionRepository.invalidateActiveByUserId(user.id)

  const pinSession = await authPinSessionRepository.create({
    id: uuidv4(),
    user_id: user.id,
    expires_at: getPinSessionExpiresAt()
  })

  await securityGuardService.recordSuccess({
    userId: user.id,
    action: 'EMPLOYEE_PIN_VERIFIED',
    resourceType: 'auth',
    resourceId: user.id,
    ipAddress: clientMeta.ip,
    userAgent: clientMeta.userAgent
  })

  return {
    pin_session_id: pinSession.id,
    key_fingerprint: userKey.key_fingerprint,
    expires_at: pinSession.expires_at,
    expires_in_seconds: Math.floor(PIN_SESSION_TTL_MS / 1000),
    message: 'تم التحقق من PIN. استخدم challenge + private key لإكمال تسجيل الدخول.'
  }
}

async function createEmployeeChallenge ({ pin_session_id, clientMeta = {} }) {
  const pinSession = await authPinSessionRepository.findById(pin_session_id)

  if (!pinSession) {
    await securityGuardService.recordFailure({
      userId: null,
      action: 'EMPLOYEE_CHALLENGE_FAILED',
      resourceType: 'auth',
      resourceId: pin_session_id,
      ipAddress: clientMeta.ip,
      userAgent: clientMeta.userAgent,
      details: { reason: 'invalid_pin_session' }
    })
    throw new Error('جلسة PIN غير صحيحة')
  }

  await securityGuardService.assertAccountNotLocked(pinSession.user_id)

  if (pinSession.used_at) {
    throw new Error('جلسة PIN مستخدمة مسبقاً')
  }

  if (new Date() > pinSession.expires_at) {
    throw new Error('جلسة PIN منتهية الصلاحية')
  }

  const userKey = await userKeyRepository.findActiveLatestByUserId(
    pinSession.user_id
  )

  if (!userKey) {
    throw new Error('لا يوجد مفتاح رقمي مرتبط بهذا الموظف')
  }

  await authChallengeRepository.invalidateByPinSessionId(pinSession.id)

  const challengeId = uuidv4()
  const nonce = generateNonce()
  const expiresAt = getChallengeExpiresAt()
  const message = buildChallengeMessage({
    challengeId,
    nonce,
    expiresAt,
    userId: pinSession.user_id,
    keyFingerprint: userKey.key_fingerprint
  })

  const challenge = await authChallengeRepository.create({
    id: challengeId,
    user_id: pinSession.user_id,
    user_key_id: userKey.id,
    pin_session_id: pinSession.id,
    message,
    message_hash: hashValue(message),
    expires_at: expiresAt
  })

  await securityGuardService.recordSuccess({
    userId: pinSession.user_id,
    action: 'EMPLOYEE_CHALLENGE_CREATED',
    resourceType: 'auth',
    resourceId: challenge.id,
    ipAddress: clientMeta.ip,
    userAgent: clientMeta.userAgent
  })

  return {
    challenge_id: challenge.id,
    pin_session_id: pinSession.id,
    key_fingerprint: userKey.key_fingerprint,
    message: challenge.message,
    expires_at: challenge.expires_at,
    expires_in_seconds: Math.floor(CHALLENGE_TTL_MS / 1000)
  }
}

async function verifyEmployeeSignature ({ challenge_id, signature, clientMeta = {} }) {
  const challengePreview = await authChallengeRepository.findById(challenge_id)

  if (challengePreview) {
    await securityGuardService.assertAccountNotLocked(challengePreview.user_id)
  }

  const sequelize = authChallengeRepository.getSequelize()
  const transaction = await sequelize.transaction()

  try {
    const challenge = await authChallengeRepository.findByIdWithLock(
      challenge_id,
      transaction
    )

    if (!challenge) {
      throw new Error('Challenge غير صحيح')
    }

    if (challenge.used_at) {
      throw new Error('Challenge مستخدم مسبقاً (replay attack)')
    }

    if (new Date() > challenge.expires_at) {
      throw new Error('Challenge منتهي الصلاحية')
    }

    const pinSession = await authPinSessionRepository.findById(
      challenge.pin_session_id,
      {
        transaction,
        lock: transaction.LOCK.UPDATE
      }
    )

    if (!pinSession || pinSession.used_at) {
      throw new Error('جلسة PIN غير صالحة')
    }

    if (new Date() > pinSession.expires_at) {
      throw new Error('جلسة PIN منتهية الصلاحية')
    }

    const userKey = await userKeyRepository.findById(challenge.user_key_id, {
      transaction
    })

    if (!userKey || !userKey.is_active) {
      throw new Error('المفتاح الرقمي غير نشط')
    }

    const signatureValid = verifyChallengeSignature({
      publicKeyPem: userKey.public_key,
      message: challenge.message,
      signatureBase64: signature
    })

    if (!signatureValid) {
      await transaction.rollback()

      await handleSecurityFailure({
        userId: challenge.user_id,
        action: 'EMPLOYEE_SIGNATURE_VERIFY_FAILED',
        message: 'التوقيع الرقمي غير صحيح',
        clientMeta,
        resourceType: 'auth',
        resourceId: challenge.id
      })
    }

    await authChallengeRepository.markUsed(challenge, transaction)
    await authPinSessionRepository.markUsed(pinSession, { transaction })

    const user = await userRepository.findById(challenge.user_id, { transaction })

    if (!user || !user.is_active) {
      throw new Error('المستخدم غير موجود أو غير مفعّل')
    }

    await transaction.commit()

    await securityGuardService.recordSuccess({
      userId: user.id,
      action: 'EMPLOYEE_LOGIN_SUCCESS',
      resourceType: 'auth',
      resourceId: user.id,
      ipAddress: clientMeta.ip,
      userAgent: clientMeta.userAgent
    })

    return buildAuthResponse(user, clientMeta)
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback()
    }

    throw error
  }
}

module.exports = {
  setupPin,
  verifyAppPin,
  changePin,
  changeCitizenPin: changePin,
  employeeVerifyPin,
  createEmployeeChallenge,
  verifyEmployeeSignature
}
