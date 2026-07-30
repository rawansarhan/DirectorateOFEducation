'use strict'

const notificationRepository = require('../repositories/notificationRepository')
const { toListItemDTO, toListItemDTOList } = require('../mappers/notificationMapper')
const {
  emptyCursorPaginatedResult,
  buildCursorPaginationMeta,
  encodeCursor
} = require('../../../core/utils/pagination')
const { retryWithBackoff } = require('../../../core/utils/retryWithBackoff')
const { MESSAGES } = require('../utils/notificationErrors')
const { createHttpError, HTTP_STATUS } = require('../../../core/middleware/httpStatusCodes')

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

  const items = toListItemDTOList(rows)
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

  const unreadCount = await retryWithBackoff(
    () => notificationRepository.countUnreadByUserId(userId),
    { label: 'notification.countUnreadByUserId' }
  )

  return {
    message: MESSAGES.MARKED_READ,
    data: {
      ...toListItemDTO(row),
      unread_count: unreadCount
    }
  }
}

function normalizeNotificationIds (rawIds) {
  if (!Array.isArray(rawIds) || rawIds.length === 0 || rawIds.length > 100) {
    throw createHttpError(
      MESSAGES.INVALID_NOTIFICATION_IDS,
      HTTP_STATUS.BAD_REQUEST,
      'VALIDATION_ERROR'
    )
  }

  const ids = []
  const seen = new Set()

  for (const raw of rawIds) {
    const id = Number(raw)

    if (!Number.isInteger(id) || id < 1) {
      throw createHttpError(
        MESSAGES.INVALID_NOTIFICATION_IDS,
        HTTP_STATUS.BAD_REQUEST,
        'VALIDATION_ERROR'
      )
    }

    if (!seen.has(id)) {
      seen.add(id)
      ids.push(id)
    }
  }

  return ids
}

async function markNotificationsAsRead ({ userId, notificationIds }) {
  const ids = normalizeNotificationIds(notificationIds)

  const rows = await retryWithBackoff(
    () => notificationRepository.markManyAsRead(ids, userId),
    { label: 'notification.markManyAsRead' }
  )

  if (!rows.length) {
    throw createHttpError(
      MESSAGES.NOT_FOUND,
      HTTP_STATUS.NOT_FOUND,
      'NOTIFICATION_NOT_FOUND'
    )
  }

  const unreadCount = await retryWithBackoff(
    () => notificationRepository.countUnreadByUserId(userId),
    { label: 'notification.countUnreadByUserId' }
  )

  const foundIds = new Set(rows.map(row => Number(row.id)))
  const notFoundIds = ids.filter(id => !foundIds.has(id))

  return {
    message: MESSAGES.MARKED_READ_BULK,
    data: {
      items: toListItemDTOList(rows),
      updated_count: rows.length,
      not_found_ids: notFoundIds,
      unread_count: unreadCount
    }
  }
}

module.exports = {
  getMyNotifications,
  markNotificationAsRead,
  markNotificationsAsRead,
  parseUnreadFilter
}
