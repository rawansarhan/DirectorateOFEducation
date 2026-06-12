const axios = require('axios')
const { retryWithBackoff } = require('../../../utils/retryWithBackoff')

class OrganizationClient {

  async getOrganizationById (id) {
    return retryWithBackoff(async () => {
      try {
        const res = await axios.get(
          `${process.env.ORGANIZATION_SERVICE_URL}/organizations/${id}`
        )

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
