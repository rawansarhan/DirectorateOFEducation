'use strict'

const { Op } = require('sequelize')
const { AuditLog, User } = require('../../../../entities')

const USER_INCLUDE = {
  model: User,
  as: 'user',
  attributes: [
    'id',
    'userName',
    'first_name',
    'last_name',
    'email'
  ],
  required: false
}

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

  buildFilterWhere ({
    userId = null,
    action = null,
    status = null,
    resourceType = null,
    fromDate = null,
    toDate = null
  } = {}) {
    const where = {}

    if (userId != null) {
      where.user_id = userId
    }

    if (action) {
      where.action = action
    }

    if (status) {
      where.status = status
    }

    if (resourceType) {
      where.resource_type = resourceType
    }

    if (fromDate || toDate) {
      where.created_at = {}
      if (fromDate) {
        where.created_at[Op.gte] = fromDate
      }
      if (toDate) {
        where.created_at[Op.lte] = toDate
      }
    }

    return where
  }

  /**
   * Cursor pagination: created_at DESC, id DESC
   * cursor = { k: 'audit', t: ISO date, id }
   */
  async findFilteredCursor ({
    userId = null,
    action = null,
    status = null,
    resourceType = null,
    fromDate = null,
    toDate = null,
    limit = 20,
    cursor = null
  } = {}) {
    const and = [
      this.buildFilterWhere({
        userId,
        action,
        status,
        resourceType,
        fromDate,
        toDate
      })
    ]

    if (cursor?.t && cursor?.id != null) {
      const cursorAt = new Date(cursor.t)
      and.push({
        [Op.or]: [
          { created_at: { [Op.lt]: cursorAt } },
          {
            created_at: cursorAt,
            id: { [Op.lt]: Number(cursor.id) }
          }
        ]
      })
    }

    const rows = await AuditLog.findAll({
      where: { [Op.and]: and },
      include: [USER_INCLUDE],
      order: [['created_at', 'DESC'], ['id', 'DESC']],
      limit: limit + 1
    })

    const hasNext = rows.length > limit
    const pageRows = hasNext ? rows.slice(0, limit) : rows

    return { rows: pageRows, hasNext }
  }
}

module.exports = new AuditLogRepository()
