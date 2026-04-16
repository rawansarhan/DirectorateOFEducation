const admin = require('../../config/firebase')

async function sendNotification ({ token, title, body, data = {} }) {
  if (!token) return

  const message = {
    token,
    notification: {
      title,
      body
    },
    data: {
      ...data
    }
  }

  try {
    await admin.messaging().send(message)
    console.log('✅ Push notification sent')
  } catch (error) {
    console.error('FCM Error:', error)
  }
}

module.exports = {
  sendNotification
}
