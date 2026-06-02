const axios = require('axios')
const { AUTH_SERVICE_URL } = require('../../../config/env')

class AuthClient {

  async getUserRoles(userId) {

    try {

     const res = await axios.get(
        `${AUTH_SERVICE_URL}/internal/users/${userId}/role-ids`
      )

      return res.data.data

    } catch (err) {

      if (err.response?.status === 404) {
        return []
      }

      throw err
    }
  }
}

module.exports = new AuthClient()
