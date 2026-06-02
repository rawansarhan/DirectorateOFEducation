const organizationService = require('../../services/internal/OrganizationServices')
const { sendOk, sendControllerError } = require('../../../../core/utils/controllerResponse')

async function getOrganizationById (req, res) {
  try {
    const organization = await organizationService.getOrganizationById(req.params.id)
    return sendOk(res, organization, 'تم جلب المؤسسة بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
}

module.exports = {
  getOrganizationById
}
