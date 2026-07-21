'use strict'

/**
 * Organization HTTP client — remote split only.
 * Same process: modules/organization/public when ORGANIZATION_SERVICE_URL is unset.
 */

const axios = require('axios')
const { retryWithBackoff } = require('../../../utils/retryWithBackoff')
const {
  resolveRemoteBaseUrl,
  shouldUseRemoteHttp
} = require('../resolveServiceMode')

const ENV_KEY = 'ORGANIZATION_SERVICE_URL'

class OrganizationClient {
  async getOrganizationById (id) {
    if (!shouldUseRemoteHttp(ENV_KEY)) {
      return require('../../../../modules/organization/public')
        .getOrganizationById(id)
    }

    const baseUrl = resolveRemoteBaseUrl(ENV_KEY)

    return retryWithBackoff(async () => {
      try {
        const res = await axios.get(`${baseUrl}/organizations/${id}`)
        return res.data.data
      } catch (err) {
        if (err.response?.status === 404) {
          return null
        }
        throw err
      }
    }, { label: 'organizationClient.getOrganizationById' })
  }
}

module.exports = new OrganizationClient()
