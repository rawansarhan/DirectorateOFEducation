'use strict'

const { UserDeviceToken } = require('../../../../entities')
const { sendPushNotification } = require('../../../auth/services/pushNotificationService')
const notificationRepository = require('../repositories/notificationRepository')

function resolveDeliveryStatus ({ sent = 0, failed = 0, skipped = false }) {
  if (skipped) {
    return 'skipped'
  }

  if (sent > 0 && failed > 0) {
    return 'partial'
  }

  if (sent > 0) {
    return 'sent'
  }

  return 'failed'
}

/**
 * Sends a Firebase push notification to a user and persists the record in notifications table.
 */
async function sendAndPersistNotification ({
  userId,
  sentByUserId = null,
  title,
  message,
  type,
  transactionId = null,
  processInstanceId = null,
  data = {},
  channel = 'firebase'
}) {
  if (!userId) {
    return {
      notificationId: null,
      sent: 0,
      failed: 0,
      skipped: true,
      reason: 'no_user_id'
    }
  }

  const deviceTokens = await UserDeviceToken.findAll({
    where: {
      user_id: userId,
      is_active: true
    },
    attributes: ['id', 'user_id', 'fcm_token']
  })

  if (!deviceTokens.length) {
    const record = await notificationRepository.create({
      user_id: userId,
      sent_by_user_id: sentByUserId,
      title,
      message,
      type,
      channel,
      status: 'skipped',
      transaction_id: transactionId,
      process_instance_id: processInstanceId,
      metadata: { skipReason: 'no_fcm_tokens', data },
      sent_count: 0,
      failed_count: 0
    })

    return {
      notificationId: record.id,
      sent: 0,
      failed: 0,
      skipped: true,
      reason: 'no_fcm_tokens'
    }
  }

  const pushResult = await sendPushNotification({
    tokens: deviceTokens.map(item => item.fcm_token),
    title,
    body: message,
    data
  })

  if (pushResult.invalidTokens?.length) {
    await UserDeviceToken.update(
      { is_active: false },
      { where: { fcm_token: pushResult.invalidTokens } }
    )
  }

  const status = resolveDeliveryStatus({
    sent: pushResult.sent,
    failed: pushResult.failed
  })

  const record = await notificationRepository.create({
    user_id: userId,
    sent_by_user_id: sentByUserId,
    title,
    message,
    type,
    channel,
    status,
    transaction_id: transactionId,
    process_instance_id: processInstanceId,
    metadata: {
      data,
      deviceCount: deviceTokens.length,
      invalidTokens: pushResult.invalidTokens || []
    },
    sent_count: pushResult.sent,
    failed_count: pushResult.failed
  })

  return {
    notificationId: record.id,
    sent: pushResult.sent,
    failed: pushResult.failed,
    skipped: false,
    status
  }
}

module.exports = {
  sendAndPersistNotification
}
