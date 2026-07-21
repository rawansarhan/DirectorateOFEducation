'use strict'

/**
 * OrgDeptRoles HTTP client — remote split only.
 * Same process: modules/organization/public when ORGANIZATION_SERVICE_URL is unset.
 */

const axios = require('axios')
const { retryWithBackoff } = require('../../../utils/retryWithBackoff')
const {
  resolveRemoteBaseUrl,
  shouldUseRemoteHttp
} = require('../resolveServiceMode')

const ENV_KEY = 'ORGANIZATION_SERVICE_URL'

function inProcess () {
  return require('../../../../modules/organization/public')
}

class OrgDeptRolesClient {
  async getOrgDeptRoleById (id) {
    if (!shouldUseRemoteHttp(ENV_KEY)) {
      return inProcess().getOrgDeptRoleById(id)
    }

    const baseUrl = resolveRemoteBaseUrl(ENV_KEY)

    return retryWithBackoff(async () => {
      try {
        const res = await axios.get(`${baseUrl}/internal/org-dept-roles/${id}`)
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
    if (!shouldUseRemoteHttp(ENV_KEY)) {
      return inProcess().getActiveOrgDeptRoles()
    }

    const baseUrl = resolveRemoteBaseUrl(ENV_KEY)

    return retryWithBackoff(async () => {
      const res = await axios.get(`${baseUrl}/internal/org-dept-roles/active`)
      return res.data.data || []
    }, { label: 'orgDeptRolesClient.getActiveOrgDeptRoles' })
  }

  async findOrgDeptRole (data) {
    if (!shouldUseRemoteHttp(ENV_KEY)) {
      return inProcess().findOrgDeptRole(data)
    }

    const baseUrl = resolveRemoteBaseUrl(ENV_KEY)

    return retryWithBackoff(async () => {
      try {
        const res = await axios.post(
          `${baseUrl}/internal/org-dept-roles/find`,
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
    if (!shouldUseRemoteHttp(ENV_KEY)) {
      return inProcess().findAllOrgDeptRole(data)
    }

    const baseUrl = resolveRemoteBaseUrl(ENV_KEY)

    return retryWithBackoff(async () => {
      try {
        const res = await axios.post(
          `${baseUrl}/internal/org-dept-roles/bulk`,
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
    if (!shouldUseRemoteHttp(ENV_KEY)) {
      return inProcess().getCitizenRole()
    }

    const baseUrl = resolveRemoteBaseUrl(ENV_KEY)

    return retryWithBackoff(async () => {
      try {
        const res = await axios.get(`${baseUrl}/internal/org-dept-roles/citizen`)
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
