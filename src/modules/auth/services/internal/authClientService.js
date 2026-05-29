const userRoleRepository =
  require('../../repositories/internal/userRoleRepository')

async function getUserRoleIds(userId) {

  const roles =
    await userRoleRepository.findActiveRolesByUserId(
      userId
    )

  return roles.map(
    r => r.organization_department_roles_id
  )
}

module.exports = {
  getUserRoleIds
}