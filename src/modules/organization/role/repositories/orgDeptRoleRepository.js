const { QueryTypes } = require('sequelize')

const {
  Role,
  Organization,
  Department,
  OrgDeptRole,
  sequelize
} = require('../../../../entities')

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

async function findActiveByRoleOrgDept (roleId, organizationId, departmentId, options = {}) {
  return OrgDeptRole.findOne({
    where: {
      role_id: roleId,
      organization_id: organizationId,
      department_id: departmentId,
      is_active: true
    },
    include: fullIncludes,
    ...options
  })
}

async function findActiveByCamundaGroupKey (camundaGroupKey, options = {}) {
  if (!camundaGroupKey) {
    return null
  }

  return OrgDeptRole.findOne({
    where: {
      camunda_group_key: String(camundaGroupKey).trim(),
      is_active: true
    },
    include: fullIncludes,
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

function normalizeRootIds(rootIds = []) {
  return [...new Set(
    rootIds
      .map(id => Number(id))
      .filter(id => Number.isInteger(id) && id > 0)
  )]
}

async function findDescendantSubtreeByRootIds(rootIds = []) {
  const ids = normalizeRootIds(rootIds)

  if (!ids.length) {
    return []
  }

  return sequelize.query(
    `
    WITH RECURSIVE subtree AS (
      SELECT id, parent_id, department_id, organization_id, role_id, 0 AS depth
      FROM organization_department_roles
      WHERE id IN (:rootIds) AND is_active = true

      UNION ALL

      SELECT odr.id, odr.parent_id, odr.department_id, odr.organization_id, odr.role_id, st.depth + 1
      FROM organization_department_roles odr
      INNER JOIN subtree st ON odr.parent_id = st.id
      WHERE odr.is_active = true
    )
    SELECT id, parent_id, department_id, organization_id, role_id, depth
    FROM subtree
    ORDER BY depth ASC, id ASC
    `,
    {
      replacements: { rootIds: ids },
      type: QueryTypes.SELECT
    }
  )
}

module.exports = {
  findById,
  findByIdWithRelations,
  findByIdWithRole,
  findByRoleOrgDept,
  findActiveByRoleOrgDept,
  findActiveByCamundaGroupKey,
  findAll,
  findActiveByDepartmentIdWithRole,
  findDescendantSubtreeByRootIds,
  create,
  updateInstance,
  destroyInstance
}
