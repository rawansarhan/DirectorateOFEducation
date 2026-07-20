const organizationService = require('../../services/internal/OrganizationServices')
const ApiResponder = require('../../../../../core/utils/apiResponder')

async function getOrganizationById(req, res, next) {

  try {

    const organization = await organizationService.getOrganizationById(
      req.params.id
    )

    return ApiResponder.okResponse(res, organization, 'تم جلب البيانات بنجاح')

  } catch (err) {
    next(err)
  }
}

module.exports = {
  getOrganizationById,
}
