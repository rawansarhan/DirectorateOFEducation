'use strict'

const notificationRepository = require('../repositories/notificationRepository')
const { NotificationListItemDTO } = require('../dto/NotificationListItemDTO')
const {
  emptyPaginatedResult,
  buildPaginationMeta
} = require('../../../../core/utils/pagination')
const { retryWithBackoff } = require('../../../../core/utils/retryWithBackoff')
const { MESSAGES } = require('../utils/notificationErrors')
const { createHttpError, HTTP_STATUS } = require('../../../../core/middleware/httpStatusCodes')

function parseUnreadFilter (rawValue) {
  if (rawValue == null || String(rawValue).trim() === '') {
    return false
  }

  const value = String(rawValue).trim().toLowerCase()

  if (['true', '1', 'yes'].includes(value)) {
    return true
  }

  if (['false', '0', 'no'].includes(value)) {
    return false
  }

  throw createHttpError(
    MESSAGES.INVALID_UNREAD,
    HTTP_STATUS.BAD_REQUEST,
    'VALIDATION_ERROR'
  )
}

async function getMyNotifications ({
  userId,
  page,
  limit,
  offset,
  unreadOnly = false,
  type = null
}) {
  const [{ rows, count }, unreadCount] = await Promise.all([
    retryWithBackoff(
      () =>
        notificationRepository.findAndCountByUserId(userId, {
          limit,
          offset,
          unreadOnly,
          type
        }),
      { label: 'notification.findAndCountByUserId' }
    ),
    retryWithBackoff(
      () => notificationRepository.countUnreadByUserId(userId),
      { label: 'notification.countUnreadByUserId' }
    )
  ])

  if (!rows.length) {
    return {
      message: MESSAGES.LIST_RETRIEVED,
      data: {
        ...emptyPaginatedResult({ page, limit }),
        unread_count: unreadCount
      }
    }
  }

  const items = rows.map(row => new NotificationListItemDTO(row))

  return {
    message: MESSAGES.LIST_RETRIEVED,
    data: {
      items,
      pagination: buildPaginationMeta({ page, limit, total: count }),
      unread_count: unreadCount
    }
  }
}

async function markNotificationAsRead ({ userId, notificationId }) {
  const row = await retryWithBackoff(
    () => notificationRepository.markAsRead(notificationId, userId),
    { label: 'notification.markAsRead' }
  )

  if (!row) {
    throw createHttpError(
      MESSAGES.NOT_FOUND,
      HTTP_STATUS.NOT_FOUND,
      'NOTIFICATION_NOT_FOUND'
    )
  }

  return {
    message: MESSAGES.MARKED_READ,
    data: new NotificationListItemDTO(row)
  }
}

module.exports = {
  getMyNotifications,
  markNotificationAsRead,
  parseUnreadFilter
}
