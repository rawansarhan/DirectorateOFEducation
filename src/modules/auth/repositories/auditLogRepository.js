'use strict'

const { AuditLog } = require('../../../entities')

class AuditLogRepository {
  async create ({
    userId = null,
    action,
    resourceType = null,
    resourceId = null,
    status = 'success',
    ipAddress = null,
    userAgent = null,
    details = null
  }) {
    return AuditLog.create({
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId ? String(resourceId) : null,
      status,
      ip_address: ipAddress,
      user_agent: userAgent,
      details
    })
  }
}

module.exports = new AuditLogRepository()
