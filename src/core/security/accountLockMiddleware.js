'use strict'

const securityGuardService = require('./securityGuardService')
const ApiResponder = require('../utils/apiResponder')

async function accountLockMiddleware (req, res, next) {
  if (!req.user?.id) {
    return next()
  }

  try {
    await securityGuardService.assertAccountNotLocked(req.user.id)
    return next()
  } catch (err) {
    if (err.code === 'ACCOUNT_LOCKED') {
      return ApiResponder.lockedResponse(res, err.message, null, {
        locked_until: err.lockedUntil
      })
    }

    return next(err)
  }
}

module.exports = accountLockMiddleware
