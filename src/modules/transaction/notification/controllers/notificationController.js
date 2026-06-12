'use strict'

const {
  getMyNotifications,
  markNotificationAsRead,
  parseUnreadFilter
} = require('../services/getMyNotificationsService')
const {
  sendNotificationSuccess,
  sendNotificationError
} = require('../utils/notificationResponseHelper')
const { parsePaginationQuery } = require('../../../../core/utils/pagination')
const { createHttpError, HTTP_STATUS } = require('../../../../core/middleware/httpStatusCodes')
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
    const { page, limit, offset } = parsePaginationQuery(req.query, {
      defaultLimit: 10,
      maxLimit: 100
    })

    const unreadOnly = parseUnreadFilter(req.query.unread)

    const result = await getMyNotifications({
      userId: req.user.id,
      page,
      limit,
      offset,
      unreadOnly,
      type: req.query.type
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

module.exports = {
  getMyNotificationsController,
  markNotificationReadController
}
