'use strict'

const { sendToUser } = require('../../../core/notifications/wsNotificationServer')
const notificationRepository = require('../repositories/notificationRepository')
const { userHasRoleCode } = require('../repositories/notificationRecipientRepository')
const { sendAndPersistNotification } = require('./notificationService')

const CITIZEN_ROLE_CODE = 'CITIZEN'

async function resolveNotificationChannelForUser (userId) {
  const isCitizen = await userHasRoleCode(userId, CITIZEN_ROLE_CODE)
  return isCitizen ? 'firebase' : 'websocket'
}

async function deliverViaWebSocket ({
  userId,
  title,
  message,
  type,
  data = {},
  transactionId = null,
  processInstanceId = null,
  sentByUserId = null
}) {
  sendToUser(userId, {
    title,
    body: message,
    payload: {
      type,
      ...data
    }
  })

  const record = await notificationRepository.create({
    user_id: userId,
    sent_by_user_id: sentByUserId,
    title,
    message,
    type,
    channel: 'in_app',
    status: 'sent',
    transaction_id: transactionId,
    process_instance_id: processInstanceId,
    metadata: {
      delivery: 'websocket',
      data
    },
    sent_count: 1,
    failed_count: 0
  })

  return {
    notificationId: record.id,
    channel: 'websocket',
    sent: 1,
    failed: 0,
    skipped: false,
    status: 'sent'
  }
}

/**
 * يوجّه الإشعار حسب دور المستخدم:
 * - CITIZEN → Firebase (تطبيق المواطن)
 * - غير ذلك → WebSocket (تطبيق الموظف / المسؤول التقني)
 */
async function deliverNotificationToUser ({
  userId,
  sentByUserId = null,
  title,
  message,
  type,
  transactionId = null,
  processInstanceId = null,
  data = {},
  channel = null
}) {
  if (!userId) {
    return {
      notificationId: null,
      channel: null,
      sent: 0,
      failed: 0,
      skipped: true,
      reason: 'no_user_id'
    }
  }

  const resolvedChannel =
    channel === 'firebase' || channel === 'websocket'
      ? channel
      : await resolveNotificationChannelForUser(userId)

  if (resolvedChannel === 'firebase') {
    const result = await sendAndPersistNotification({
      userId,
      sentByUserId,
      title,
      message,
      type,
      transactionId,
      processInstanceId,
      data,
      channel: 'firebase'
    })

    return {
      ...result,
      channel: 'firebase'
    }
  }

  return deliverViaWebSocket({
    userId,
    sentByUserId,
    title,
    message,
    type,
    data,
    transactionId,
    processInstanceId
  })
}

module.exports = {
  CITIZEN_ROLE_CODE,
  resolveNotificationChannelForUser,
  deliverNotificationToUser
}
