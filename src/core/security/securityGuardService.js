'use strict'

const auditLogRepository = require('../../modules/auth/shared/repositories/auditLogRepository')
const userRepository = require('../../modules/auth/shared/repositories/userRepository')
const {
  MAX_FAILED_ATTEMPTS,
  LOCK_DURATION_MS
} = require('./securityConfig')

class SecurityGuardService {
  async assertAccountNotLocked (userId) {
    const user = await userRepository.findById(userId)

    if (!user) {
      throw new Error('المستخدم غير موجود')
    }

    if (user.security_locked_until && new Date() < user.security_locked_until) {
      const error = new Error('الحساب مقفل مؤقتاً بسبب محاولات فاشلة متكررة')
      error.code = 'ACCOUNT_LOCKED'
      error.lockedUntil = user.security_locked_until
      throw error
    }

    if (user.security_locked_until && new Date() >= user.security_locked_until) {
      await userRepository.resetSecurityLock(user)
    }

    return user
  }

  async recordSuccess ({
    userId,
    action,
    resourceType = null,
    resourceId = null,
    ipAddress = null,
    userAgent = null,
    details = null
  }) {
    if (userId) {
      await userRepository.resetSecurityLockById(userId)
    }

    return auditLogRepository.create({
      userId,
      action,
      resourceType,
      resourceId,
      status: 'success',
      ipAddress,
      userAgent,
      details
    })
  }

  async recordFailure ({
    userId = null,
    action,
    resourceType = null,
    resourceId = null,
    ipAddress = null,
    userAgent = null,
    details = null
  }) {
    await auditLogRepository.create({
      userId,
      action,
      resourceType,
      resourceId,
      status: 'failure',
      ipAddress,
      userAgent,
      details
    })

    if (!userId) {
      return { locked: false, attempts: null }
    }

    const user = await userRepository.findById(userId)

    if (!user) {
      return { locked: false, attempts: null }
    }

    const attempts = (user.security_failed_attempts || 0) + 1
    const shouldLock = attempts >= MAX_FAILED_ATTEMPTS
    const lockedUntil = shouldLock
      ? new Date(Date.now() + LOCK_DURATION_MS)
      : null

    await userRepository.updateSecurityState(user, {
      security_failed_attempts: shouldLock ? 0 : attempts,
      security_locked_until: lockedUntil
    })

    if (shouldLock) {
      await auditLogRepository.create({
        userId,
        action: 'ACCOUNT_LOCKED',
        resourceType: 'user',
        resourceId: userId,
        status: 'blocked',
        ipAddress,
        userAgent,
        details: {
          reason: action,
          attempts: MAX_FAILED_ATTEMPTS,
          lockedUntil
        }
      })
    }

    return {
      locked: shouldLock,
      attempts: shouldLock ? MAX_FAILED_ATTEMPTS : attempts,
      remainingAttempts: shouldLock ? 0 : Math.max(MAX_FAILED_ATTEMPTS - attempts, 0),
      lockedUntil
    }
  }

  async recordBlocked ({
    userId = null,
    action,
    resourceType = null,
    resourceId = null,
    ipAddress = null,
    userAgent = null,
    details = null
  }) {
    return auditLogRepository.create({
      userId,
      action,
      resourceType,
      resourceId,
      status: 'blocked',
      ipAddress,
      userAgent,
      details
    })
  }
}

module.exports = new SecurityGuardService()
