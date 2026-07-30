'use strict'

const {
  getMyNotifications,
  markNotificationAsRead,
  markNotificationsAsRead,
  parseUnreadFilter
} = require('../services/getMyNotificationsService')
const {
  sendNotificationSuccess,
  sendNotificationError
} = require('../utils/notificationResponseHelper')
const { parseCursorPaginationQuery } = require('../../../core/utils/pagination')
const { createHttpError, HTTP_STATUS } = require('../../../core/middleware/httpStatusCodes')
const { MESSAGES } = require('../utils/notificationErrors')

function parseNotificationId (rawId) {
  if (!/^\d+$/.test(String(rawId || '')) || parseInt(rawId, 10) < 1) {
    throw createHttpError(
      MESSAGES.INVALID_NOTIFICATION_ID,
      HTTP_STATUS.BAD_REQUEST,
      'VALIDATION_ERROR'
    )
  }

  return parseInt(rawId, 10)
}

async function getMyNotificationsController (req, res) {
  try {
    const { limit, cursor, decodedCursor } = parseCursorPaginationQuery(req.query, {
      defaultLimit: 10,
      maxLimit: 100
    })

    const unreadOnly = parseUnreadFilter(req.query.unread)

    const result = await getMyNotifications({
      userId: req.user.id,
      limit,
      cursor,
      decodedCursor,
      unreadOnly
    })

    return sendNotificationSuccess(res, result.data, result.message)
  } catch (err) {
    return sendNotificationError(res, err)
  }
}

async function markNotificationReadController (req, res) {
  try {
    const notificationId = parseNotificationId(req.params.notificationId)

    const result = await markNotificationAsRead({
      userId: req.user.id,
      notificationId
    })

    return sendNotificationSuccess(res, result.data, result.message)
  } catch (err) {
    return sendNotificationError(res, err)
  }
}

async function markNotificationsReadController (req, res) {
  try {
    const result = await markNotificationsAsRead({
      userId: req.user.id,
      notificationIds: req.body?.notification_ids ?? req.body?.ids
    })

    return sendNotificationSuccess(res, result.data, result.message)
  } catch (err) {
    return sendNotificationError(res, err)
  }
}

module.exports = {
  getMyNotificationsController,
  markNotificationReadController,
  markNotificationsReadController
}
