'use strict'

const securityGuardService = require('./securityGuardService')

async function accountLockMiddleware (req, res, next) {
  if (!req.user?.id) {
    return next()
  }

  try {
    await securityGuardService.assertAccountNotLocked(req.user.id)
    return next()
  } catch (err) {
    if (err.code === 'ACCOUNT_LOCKED') {
      return res.status(423).json({
        success: false,
        message: err.message,
        locked_until: err.lockedUntil
      })
    }

    return next(err)
  }
}

module.exports = accountLockMiddleware
