'use strict'

const ApiResponder = require('../utils/apiResponder')
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
      return ApiResponder.lockedResponse(res, err.message, err.code)
    }

    return next(err)
  }
}

module.exports = accountLockMiddleware
