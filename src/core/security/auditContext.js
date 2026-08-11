'use strict'

const { getClientMeta } = require('./securityConfig')

function buildAuditContext (req) {
  const meta = getClientMeta(req)

  return {
    actorUserId: req.user?.id || null,
    ip: meta.ip,
    userAgent: meta.userAgent
  }
}

module.exports = {
  buildAuditContext
}
