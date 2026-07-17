'use strict'

const notificationRepository = require('../repositories/notificationRepository')
const { NotificationListItemDTO } = require('../dto/NotificationListItemDTO')
const {
  emptyCursorPaginatedResult,
  buildCursorPaginationMeta,
  encodeCursor
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

function buildNotificationCursor (row) {
  const createdAt = row.created_at
    ? new Date(row.created_at).toISOString()
    : null

  if (!createdAt || !Number.isFinite(Number(row.id))) {
    return null
  }

  return encodeCursor({
    k: 'notif',
    t: createdAt,
    id: Number(row.id)
  })
}

async function getMyNotifications ({
  userId,
  limit,
  cursor = null,
  decodedCursor = null,
  unreadOnly = false
}) {
  const [{ rows, hasNext }, unreadCount] = await Promise.all([
    retryWithBackoff(
      () =>
        notificationRepository.findByUserIdWithCursor(userId, {
          limit,
          cursor: decodedCursor,
          unreadOnly
        }),
      { label: 'notification.findByUserIdWithCursor' }
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
        ...emptyCursorPaginatedResult({ limit, cursor }),
        unread_count: unreadCount
      }
    }
  }

  const items = rows.map(row => new NotificationListItemDTO(row))
  const lastItem = rows[rows.length - 1]
  const nextCursor = hasNext ? buildNotificationCursor(lastItem) : null

  return {
    message: MESSAGES.LIST_RETRIEVED,
    data: {
      items,
      pagination: buildCursorPaginationMeta({
        limit,
        cursor,
        nextCursor,
        hasNext
      }),
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
