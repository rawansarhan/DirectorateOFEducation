'use strict'

/**
 * Public port — organization bounded context.
 * Prefer this for in-process calls. HTTP clients are for remote split only.
 */

module.exports = {
  get getOrganizationById () {
    return require('../organization/services/internal/OrganizationServices')
      .getOrganizationById
  },

  get getOrgDeptRoleById () {
    return require('../role/services/internal/OrgDeptRoleServices')
      .getOrgDeptRoleById
  },
  get getActiveOrgDeptRoles () {
    return require('../role/services/internal/OrgDeptRoleServices')
      .getActiveRoles
  },
  get findOrgDeptRole () {
    return require('../role/services/internal/OrgDeptRoleServices')
      .findOrgDeptRole
  },
  get findAllOrgDeptRole () {
    const { getOrgDeptRolesByIdsServices } =
      require('../role/services/internal/OrgDeptRoleServices')

    return async function findAllOrgDeptRole (data = {}) {
      const ids = Array.isArray(data) ? data : data.ids
      return getOrgDeptRolesByIdsServices(ids || [])
    }
  },
  get getCitizenRole () {
    const { findCitizenRole } =
      require('../role/services/internal/OrgDeptRoleServices')

    return async function getCitizenRole () {
      try {
        return await findCitizenRole()
      } catch (err) {
        if (err.statusCode === 404 || err.message === 'CITIZEN role not found') {
          return null
        }
        throw err
      }
    }
  }
}
