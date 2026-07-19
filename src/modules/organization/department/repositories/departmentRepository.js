const { Op } = require('sequelize')
const {
  Department,
  Organization,
  OrgDeptRole,
  UserRoleAssignment,
  User,
  Role,
  Transaction
} = require('../../../../entities')

async function findById(id) {
  return Department.findByPk(id)
}

async function findByIdWithRelations(id) {
  return Department.findByPk(id, {
    include: [
      { model: Organization, as: 'organization' },
      { model: Department, as: 'parent' },
      { model: Department, as: 'children' }
    ]
  })
}

async function findAll() {
  return Department.findAll({
    order: [['id', 'ASC']],
    include: [
      { model: Organization, as: 'organization' },
      { model: Department, as: 'parent' }
    ]
  })
}

async function findAllByOrganizationId(organizationId) {
  return Department.findAll({
    where: { organization_id: organizationId },
    attributes: ['id', 'name', 'parent_id'],
    order: [['id', 'ASC']]
  })
}

// All org-dept-roles in a department, each with its role and the active users
// assigned to it. Used to derive a department's manager + employee list.
async function findRolesWithUsersByDepartmentId(departmentId) {
  return OrgDeptRole.findAll({
    where: { department_id: departmentId },
    include: [
      { model: Role, as: 'role', attributes: ['id', 'name', 'code'] },
      {
        model: UserRoleAssignment,
        as: 'user_assignments',
        required: false,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'userName', 'email', 'phone_number', 'is_active']
          }
        ]
      }
    ],
    order: [
      ['parent_id', 'ASC'],
      ['id', 'ASC']
    ]
  })
}

// Transactions are owned by users (no direct department link), so a
// department's transaction count is the count over its members' user ids.
async function countTransactionsByUserIds(userIds) {
  if (!userIds || userIds.length === 0) return 0
  return Transaction.count({
    where: { user_id: { [Op.in]: userIds } }
  })
}

async function create(data) {
  return Department.create(data)
}

async function updateInstance(department, payload) {
  await department.update(payload)
  await department.reload()
  return department
}

async function destroyInstance(department) {
  return department.destroy()
}

module.exports = {
  findById,
  findByIdWithRelations,
  findAll,
  findAllByOrganizationId,
  findRolesWithUsersByDepartmentId,
  countTransactionsByUserIds,
  create,
  updateInstance,
  destroyInstance
}
