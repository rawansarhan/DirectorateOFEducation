'use strict'

/**
 * Auth HTTP client — remote split only.
 * Same process: modules/auth/public when AUTH_SERVICE_URL is unset.
 */

const axios = require('axios')
const { retryWithBackoff } = require('../../../utils/retryWithBackoff')
const {
  resolveRemoteBaseUrl,
  shouldUseRemoteHttp
} = require('../resolveServiceMode')

const ENV_KEY = 'AUTH_SERVICE_URL'

class AuthClient {
  async getUserRoles (userId) {
    if (!shouldUseRemoteHttp(ENV_KEY)) {
      return require('../../../../modules/auth/public').getUserRoles(userId)
    }

    const baseUrl = resolveRemoteBaseUrl(ENV_KEY)

    return retryWithBackoff(async () => {
      try {
        const res = await axios.get(
          `${baseUrl}/internal/users/${userId}/role-ids`
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
