const {
  Role,
  Organization,
  Department,
  OrgDeptRole
} = require('../../../entities')

const fullIncludes = [
  { model: Role, as: 'role' },
  { model: Organization, as: 'organization' },
  { model: Department, as: 'department' },
  { model: OrgDeptRole, as: 'parent' }
]

async function findById(id) {
  return OrgDeptRole.findByPk(id)
}

async function findByIdWithRelations(id, { includeChildren = false } = {}) {
  const include = [...fullIncludes]
  if (includeChildren) {
    include.push({ model: OrgDeptRole, as: 'children' })
  }
  return OrgDeptRole.findByPk(id, { include })
}

async function findByIdWithRole(id) {
  return OrgDeptRole.findByPk(id, {
    include: [{ model: Role, as: 'role' }]
  })
}

async function findByRoleOrgDept(roleId, organizationId, departmentId, options = {}) {
  return OrgDeptRole.findOne({
    where: {
      role_id: roleId,
      organization_id: organizationId,
      department_id: departmentId
    },
    ...options
  })
}

async function findAll() {
  return OrgDeptRole.findAll({
    order: [['id', 'ASC']],
    include: fullIncludes
  })
}

async function findActiveByDepartmentIdWithRole(departmentId) {
  return OrgDeptRole.findAll({
    where: { department_id: departmentId, is_active: true },
    include: [
      {
        model: Role,
        as: 'role',
        attributes: ['id', 'name', 'code']
      }
    ],
    order: [['id', 'ASC']]
  })
}

async function create(data, options = {}) {
  return OrgDeptRole.create(data, options)
}

async function updateInstance(orgDeptRole, payload) {
  await orgDeptRole.update(payload)
  return orgDeptRole
}

async function destroyInstance(orgDeptRole) {
  return orgDeptRole.destroy()
}

module.exports = {
  findById,
  findByIdWithRelations,
  findByIdWithRole,
  findByRoleOrgDept,
  findAll,
  findActiveByDepartmentIdWithRole,
  create,
  updateInstance,
  destroyInstance
}
