const organizationService = require('../../services/internal/OrgDeptRoleServices')


async function getOrgDeptRoleById(req, res, next) {

  try {

    const role = await organizationService.getOrgDeptRoleById(
      req.params.id
    )

    return res.json({
      success: true,
      data: role
    })

  } catch (err) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message
    })
  }
}




async function getActiveRoles(req, res, next) {

  try {

    const result =
      await organizationService.getActiveRoles()

    res.json({
      success: true,
      data: result
    })

  } catch (err) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message
    })
  }
}


///////////////////////////////////////////////////////////////////////////////////
// ==============================   find OrgDeptRole ==============================

async function findOneOrgDeptRole(req, res) {

  try {

    const result =
      await organizationService.findOrgDeptRole(
        req.body
      )

    return res.json({
      success: true,
      data: result
    })

  } catch (err) {

    return res.status(
      err.statusCode || 400
    ).json({
      success: false,
      message: err.message
    })
  }
}

/////////////////////////////////////////////////////////////////////////////////////
//============================= find OrgDeptRoles By Ids ============================

async function getOrgDeptRolesByIds(req, res, next) {

  try {

    const { ids } = req.body

    const data =
      await organizationService.getOrgDeptRolesByIdsServices(ids)

    return res.status(200).json({

      success: true,

      data
    })

  } catch (err) {

    next(err)
  }
}

/////////////////////////////////////////////////////////////////////////////////////
// ============================== GET CITIZEN ROLE ================================
/////////////////////////////////////////////////////////////////////////////////////

async function getCitizenRole(req, res, next) {

  try {

    const result =
      await organizationService.findCitizenRole()

    return res.json({
      success: true,
      data: result
    })

  } catch (err) {

    return res.status(
      err.statusCode || 400
    ).json({
      success: false,
      message: err.message
    })
  }
}

module.exports = {
  getOrgDeptRoleById,
  getActiveRoles,
  findOneOrgDeptRole,
  getOrgDeptRolesByIds,
  getCitizenRole
}