const { OrgDeptRole } = require('../../../entities')

async function findByOrgDeptRole (organizationId, departmentId, roleId, options = {}) {
  return OrgDeptRole.findOne({
    where: {
      organization_id: organizationId,
      department_id: departmentId,
      role_id: roleId,
      is_active: true
    },
    ...options
  })
}

async function findByCamundaGroupKey (camundaGroupKey, options = {}) {
  return OrgDeptRole.findOne({
    where: {
      camunda_group_key: camundaGroupKey,
      is_active: true
    },
    ...options
  })
}

module.exports = {
  findByOrgDeptRole,
  findByCamundaGroupKey
}
