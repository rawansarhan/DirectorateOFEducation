const axios = require('axios')
const { ORGANIZATION_SERVICE_URL } = require('../../../config/env')

const BASE_URL = ORGANIZATION_SERVICE_URL

class OrganizationClient {


      async getOrgDeptRoleById(id) {

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
  }

  // =====================================
  // GET ACTIVE ORG DEPT ROLES
  // =====================================

  async getActiveOrgDeptRoles() {

    try {

      const res = await axios.get(

        `${BASE_URL}/internal/org-dept-roles/active`
      )

      return res.data.data || []

    } catch (err) {

      throw err
    }
  }


//////////////////////////////////////////////////////////////////////////////
/// ====================== find OrgDeptRole ==================================

async findOrgDeptRole(data) {

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
}


  async findAllOrgDeptRole(data) {

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
  }


    // =====================================
  // GET CITIZEN ROLE
  // =====================================

  async getCitizenRole() {

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
  }
}
module.exports =
  new OrganizationClient()
