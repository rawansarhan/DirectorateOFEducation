'use strict'

const securityGuardService = require('./securityGuardService')
const ApiResponder = require('../utils/apiResponder')
const { getClientMeta } = require('./securityConfig')
const { auditBlocked } = require('./safeAudit')
const { AUDIT_ACTIONS } = require('./auditActions')

async function accountLockMiddleware (req, res, next) {
  if (!req.user?.id) {
    return next()
  }

  try {
    await securityGuardService.assertAccountNotLocked(req.user.id)
    return next()
  } catch (err) {
    if (err.code === 'ACCOUNT_LOCKED') {
      const meta = getClientMeta(req)

      await auditBlocked({
        userId: req.user.id,
        action: AUDIT_ACTIONS.ACCOUNT_ACCESS_BLOCKED,
        resourceType: 'user',
        resourceId: req.user.id,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
        details: {
          reason: 'ACCOUNT_LOCKED',
          path: req.originalUrl || req.url,
          method: req.method,
          locked_until: err.lockedUntil || null
        }
      })

      return ApiResponder.lockedResponse(res, err.message, null, {
        locked_until: err.lockedUntil
      })
    }

    return next(err)
  }
}

module.exports = accountLockMiddleware
