
const repository = require('../../repositories/internal/organizationClient')

async function getOrganizationById(id) {

  const organization = await repository.findById(id)

  if (!organization) {
    return null
  }

  return {
    id: organization.id,
    name: organization.name
  }
}

module.exports = {
  getOrganizationById
}