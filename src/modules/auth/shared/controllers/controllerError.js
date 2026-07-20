'use strict'

const { respondIfSecurityError } = require('../../../../core/security/securityResponseHelper')
const ApiResponder = require('../../../../core/utils/apiResponder')

function handleControllerError (res, err, defaultStatus = 400) {
  if (respondIfSecurityError(res, err, defaultStatus)) {
    return
  }

  return ApiResponder.error(res, {
    message: err.message,
    statusCode: err.statusCode || defaultStatus,
    data: null
  })
}

module.exports = { handleControllerError }
