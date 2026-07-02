'use strict'

const { Notification, User } = require('../../../../entities')

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
      order: [['created_at', 'DESC']],
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
    const row = await this.findByIdForUser(notificationId, userId)

    if (!row) {
      return null
    }

    if (!row.read_at) {
      await row.update({ read_at: new Date() })
    }

    return row
  }
}

module.exports = new NotificationRepository()
