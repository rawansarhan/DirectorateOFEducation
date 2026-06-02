const organizationService = require('../../services/internal/OrgDeptRoleServices')
const { sendOk, sendControllerError } = require('../../../../core/utils/controllerResponse')

async function getOrgDeptRoleById (req, res) {
  try {
    const role = await organizationService.getOrgDeptRoleById(req.params.id)
    return sendOk(res, role, 'تم جلب الدور بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
}

async function getActiveRoles (req, res) {
  try {
    const result = await organizationService.getActiveRoles()
    return sendOk(res, result, 'تم جلب الأدوار بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
}

async function findOneOrgDeptRole (req, res) {
  try {
    const result = await organizationService.findOrgDeptRole(req.body)
    return sendOk(res, result, 'تم جلب الدور بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
}

async function getOrgDeptRolesByIds (req, res) {
  try {
    const data = await organizationService.getOrgDeptRolesByIdsServices(req.body.ids)
    return sendOk(res, data, 'تم جلب الأدوار بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
}

async function getCitizenRole (req, res) {
  try {
    const result = await organizationService.findCitizenRole()
    return sendOk(res, result, 'تم جلب دور المواطن بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
}

module.exports = {
  getOrgDeptRoleById,
  getActiveRoles,
  findOneOrgDeptRole,
  getOrgDeptRolesByIds,
  getCitizenRole
}
