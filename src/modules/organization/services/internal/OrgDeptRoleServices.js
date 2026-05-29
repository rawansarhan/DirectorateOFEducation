////////////////////////////////////////////////////////////////////
const repository = require('../../repositories/internal/orgDeptRoleClient')


async function getOrgDeptRoleById (id) {
  const role = await repository.findByPk(id)

  if (!role) {
    return null
  }

  return {
    id: role.id,
    name: role.name,
    is_active: role.is_active
  }
}

///////////////////////////////////////////////////////////////////

async function getActiveRoles () {
  return await repository.findActive()
}

///////////////////////////////////////////////////////////////////////

async function findOrgDeptRole (data) {

  return await repository.findOne({
    organization_id: data.organization_id,

    department_id: data.department_id,

    role_id: data.role_id
  })
}

//////////////////////////////////////////////////////////////////////
//

async function getOrgDeptRolesByIdsServices(ids) {

  if (!Array.isArray(ids)) {
    throw new Error('ids must be array')
  }

  if (!ids.length) {
    return []
  }

  return await repository.findAllByIds(ids)
}


/////////////////////////////////////////////////////////////////////////////////////
// ============================== GET CITIZEN ROLE ================================
/////////////////////////////////////////////////////////////////////////////////////

async function findCitizenRole() {

  const role =
    await repository.findCitizenRole()

  if (!role) {
    const error = new Error('CITIZEN role not found')
    error.statusCode = 404
    throw error
  }

  return role
}
module.exports = {
  getOrgDeptRoleById,
  getActiveRoles,
  findOrgDeptRole,
  getOrgDeptRolesByIdsServices,
  findCitizenRole
}
