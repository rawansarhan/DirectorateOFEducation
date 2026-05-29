'use strict'

const { getFirebaseAdmin } = require('../../../../config/firebase')

function isInvalidTokenError (errorCode) {
  return [
    'messaging/invalid-registration-token',
    'messaging/registration-token-not-registered'
  ].includes(errorCode)
}

async function sendPushNotification ({
  tokens,
  title,
  body,
  data = {}
}) {
  const uniqueTokens = [...new Set(tokens.filter(Boolean))]

  if (!uniqueTokens.length) {
    return {
      sent: 0,
      failed: 0,
      invalidTokenIds: [],
      results: []
    }
  }

  const admin = getFirebaseAdmin()

  const stringData = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, String(value ?? '')])
  )

  const response = await admin.messaging().sendEachForMulticast({
    tokens: uniqueTokens,
    notification: {
      title,
      body
    },
    data: stringData,
    android: {
      priority: 'high',
      notification: {
        sound: 'default'
      }
    },
    apns: {
      payload: {
        aps: {
          sound: 'default'
        }
      }
    }
  })

  const results = response.responses.map((item, index) => ({
    token: uniqueTokens[index],
    success: item.success,
    messageId: item.messageId || null,
    error: item.error?.code || null
  }))

  const invalidTokens = results
    .filter(item => !item.success && isInvalidTokenError(item.error))
    .map(item => item.token)

  return {
    sent: response.successCount,
    failed: response.failureCount,
    invalidTokens,
    results
  }
}

module.exports = {
  sendPushNotification,
  getFirebaseAdmin
}
