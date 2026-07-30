'use strict'

const { Op } = require('sequelize')
const { Notification, User } = require('../../../entities')

class NotificationRepository {
  async create (data) {
    return Notification.create(data)
  }

  async findAndCountByUserId (userId, {
    limit = 50,
    offset = 0,
    unreadOnly = false,
    type = null
  } = {}) {
    const where = { user_id: userId }

    if (unreadOnly) {
      where.read_at = null
    }

    if (type) {
      where.type = String(type).trim()
    }

    return Notification.findAndCountAll({
      where,
      order: [['created_at', 'DESC'], ['id', 'DESC']],
      limit,
      offset,
      include: [{
        model: User,
        as: 'sender',
        attributes: ['id', 'userName'],
        required: false
      }]
    })
  }

  async findByUserIdWithCursor (userId, {
    limit = 10,
    cursor = null,
    unreadOnly = false
  } = {}) {
    const where = { user_id: userId }

    if (unreadOnly) {
      where.read_at = null
    }

    if (cursor?.t && Number.isFinite(Number(cursor.id))) {
      const cursorAt = new Date(cursor.t)
      const cursorId = Number(cursor.id)

      where[Op.and] = [
        ...(where[Op.and] || []),
        {
          [Op.or]: [
            { created_at: { [Op.lt]: cursorAt } },
            {
              created_at: cursorAt,
              id: { [Op.lt]: cursorId }
            }
          ]
        }
      ]
    }

    const rows = await Notification.findAll({
      where,
      order: [['created_at', 'DESC'], ['id', 'DESC']],
      limit: limit + 1,
      include: [{
        model: User,
        as: 'sender',
        attributes: ['id', 'userName'],
        required: false
      }]
    })

    const hasNext = rows.length > limit
    const pageRows = hasNext ? rows.slice(0, limit) : rows

    return { rows: pageRows, hasNext }
  }

  async countUnreadByUserId (userId) {
    return Notification.count({
      where: {
        user_id: userId,
        read_at: null
      }
    })
  }

  async findByIdForUser (notificationId, userId) {
    return Notification.findOne({
      where: {
        id: notificationId,
        user_id: userId
      },
      include: [{
        model: User,
        as: 'sender',
        attributes: ['id', 'userName'],
        required: false
      }]
    })
  }

  async markAsRead (notificationId, userId) {
    const id = Number(notificationId)
    const uid = Number(userId)

    if (!Number.isInteger(id) || id < 1 || !Number.isInteger(uid) || uid < 1) {
      return null
    }

    // كتابة مباشرة على الجدول — بدون الاعتماد على حالة الـ instance بالذاكرة
    const [affected] = await Notification.update(
      { read_at: new Date() },
      {
        where: {
          id,
          user_id: uid
        }
      }
    )

    if (!affected) {
      return null
    }

    return this.findByIdForUser(id, uid)
  }

  async markManyAsRead (notificationIds, userId) {
    const uid = Number(userId)
    const ids = [...new Set(
      (notificationIds || [])
        .map(id => Number(id))
        .filter(id => Number.isInteger(id) && id >= 1)
    )]

    if (!Number.isInteger(uid) || uid < 1 || !ids.length) {
      return []
    }

    await Notification.update(
      { read_at: new Date() },
      {
        where: {
          id: { [Op.in]: ids },
          user_id: uid
        }
      }
    )

    return Notification.findAll({
      where: {
        id: { [Op.in]: ids },
        user_id: uid
      },
      order: [['id', 'ASC']],
      include: [{
        model: User,
        as: 'sender',
        attributes: ['id', 'userName'],
        required: false
      }]
    })
  }
}

module.exports = new NotificationRepository()
