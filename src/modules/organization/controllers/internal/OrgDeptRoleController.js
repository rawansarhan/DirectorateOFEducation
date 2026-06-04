const organizationService = require('../../services/internal/OrgDeptRoleServices')
const ApiResponder = require('../../../../core/utils/apiResponder')


async function getOrgDeptRoleById(req, res, next) {

  try {

    const role = await organizationService.getOrgDeptRoleById(
      req.params.id
    )

    return ApiResponder.okResponse(res, role, 'تم جلب البيانات بنجاح')

  } catch (err) {
    return ApiResponder.error(res, { message: err.message, statusCode: err.statusCode || 400 })
  }
}




async function getActiveRoles(req, res, next) {

  try {

    const result =
      await organizationService.getActiveRoles()

    return ApiResponder.okResponse(res, result, 'تم جلب البيانات بنجاح')

  } catch (err) {
    return ApiResponder.error(res, { message: err.message, statusCode: err.statusCode || 400 })
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

    return ApiResponder.okResponse(res, result, 'تم جلب البيانات بنجاح')

  } catch (err) {

    return ApiResponder.error(res, { message: err.message, statusCode: err.statusCode || 400 })
  }
}

/////////////////////////////////////////////////////////////////////////////////////
//============================= find OrgDeptRoles By Ids ============================

async function getOrgDeptRolesByIds(req, res, next) {

  try {

    const { ids } = req.body

    const data =
      await organizationService.getOrgDeptRolesByIdsServices(ids)

    return ApiResponder.okResponse(res, data, 'تم جلب البيانات بنجاح')

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

    return ApiResponder.okResponse(res, result, 'تم جلب البيانات بنجاح')

  } catch (err) {

    return ApiResponder.error(res, { message: err.message, statusCode: err.statusCode || 400 })
  }
}

module.exports = {
  getOrgDeptRoleById,
  getActiveRoles,
  findOneOrgDeptRole,
  getOrgDeptRolesByIds,
  getCitizenRole
}
