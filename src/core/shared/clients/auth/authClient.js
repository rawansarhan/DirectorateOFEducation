const axios = require('axios')
const { retryWithBackoff } = require('../../../utils/retryWithBackoff')

class AuthClient {

  async getUserRoles (userId) {
    return retryWithBackoff(async () => {
      try {
        const res = await axios.get(
          `${process.env.AUTH_SERVICE_URL}/internal/users/${userId}/role-ids`
        )

        return res.data.data
      } catch (err) {
        if (err.response?.status === 404) {
          return []
        }

        throw err
      }
    }, { label: 'authClient.getUserRoles' })
  }
}

module.exports = new AuthClient()
