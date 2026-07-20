'use strict'

const { UserDeviceToken } = require('../../../../entities')

class UserDeviceTokenRepository {
  async findByFcmToken (fcmToken) {
    return UserDeviceToken.findOne({
      where: { fcm_token: fcmToken }
    })
  }

  async create (data) {
    return UserDeviceToken.create(data)
  }

  async update (token, data) {
    return token.update(data)
  }
}

module.exports = new UserDeviceTokenRepository()
