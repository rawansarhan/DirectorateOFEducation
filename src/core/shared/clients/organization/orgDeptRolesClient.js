const axios = require('axios')
const { retryWithBackoff } = require('../../../utils/retryWithBackoff')

const BASE_URL =
  process.env.ORGANIZATION_SERVICE_URL ||
  `http://localhost:${process.env.PORT || 4000}`

class OrgDeptRolesClient {

  async getOrgDeptRoleById (id) {
    return retryWithBackoff(async () => {
      try {
        const res = await axios.get(
          `${BASE_URL}/internal/org-dept-roles/${id}`
        )

        return res.data.data
      } catch (err) {
        if (err.response?.status === 404) {
          return null
        }

        throw err
      }
    }, { label: 'orgDeptRolesClient.getOrgDeptRoleById' })
  }

  async getActiveOrgDeptRoles () {
    return retryWithBackoff(async () => {
      const res = await axios.get(
        `${BASE_URL}/internal/org-dept-roles/active`
      )

      return res.data.data || []
    }, { label: 'orgDeptRolesClient.getActiveOrgDeptRoles' })
  }

  async findOrgDeptRole (data) {
    return retryWithBackoff(async () => {
      try {
        const res = await axios.post(
          `${BASE_URL}/internal/org-dept-roles/find`,
          data
        )

        return res.data.data
      } catch (err) {
        if (err.response?.status === 404) {
          return null
        }

        throw err
      }
    }, { label: 'orgDeptRolesClient.findOrgDeptRole' })
  }

  async findAllOrgDeptRole (data) {
    return retryWithBackoff(async () => {
      try {
        const res = await axios.post(
          `${BASE_URL}/internal/org-dept-roles/bulk`,
          data
        )

        return res.data.data || []
      } catch (err) {
        if (err.response?.status === 404) {
          return []
        }

        throw err
      }
    }, { label: 'orgDeptRolesClient.findAllOrgDeptRole' })
  }

  async getCitizenRole () {
    return retryWithBackoff(async () => {
      try {
        const res = await axios.get(
          `${BASE_URL}/internal/org-dept-roles/citizen`
        )

        return res.data.data || null
      } catch (err) {
        if (err.response?.status === 404) {
          return null
        }

        throw err
      }
    }, { label: 'orgDeptRolesClient.getCitizenRole' })
  }
}

module.exports = new OrgDeptRolesClient()
