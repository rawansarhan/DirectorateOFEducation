const axios = require('axios')

class OrganizationClient {

  async getOrganizationById(id) {

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
  }


}

module.exports = new OrganizationClient()