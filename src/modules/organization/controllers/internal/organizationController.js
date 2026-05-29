const organizationService = require('../../services/internal/OrganizationServices')

async function getOrganizationById(req, res, next) {

  try {

    const organization = await organizationService.getOrganizationById(
      req.params.id
    )

    return res.json({
      success: true,
      data: organization
    })

  } catch (err) {
    next(err)
  }
}

module.exports = {
  getOrganizationById,
}