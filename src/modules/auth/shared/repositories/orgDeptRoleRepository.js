const { OrgDeptRole } = require('../../../../entities')

async function findByOrgDeptRole(organizationId, departmentId, roleId, options = {}) {
  return OrgDeptRole.findOne({
    where: {
      organization_id: organizationId,
      department_id: departmentId,
      role_id: roleId
    },
    ...options
  })
}

async function findByCamundaGroupKey(camundaGroupKey, options = {}) {
  return OrgDeptRole.findOne({
    where: { camunda_group_key: camundaGroupKey },
    ...options
  })
}

async function findById (id, options = {}) {
  return OrgDeptRole.findByPk(id, options)
}

module.exports = {
  findByOrgDeptRole,
  findByCamundaGroupKey,
  findById
}
