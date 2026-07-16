'use strict'

const {
  UserRoleAssignment,
  OrgDeptRole,
  Role,
  User
} = require('../../../../entities')

async function userHasRoleCode (userId, roleCode) {
  if (!userId || !roleCode) {
    return false
  }

  const count = await UserRoleAssignment.count({
    where: {
      user_id: userId,
      is_active: true
    },
    include: [
      {
        model: OrgDeptRole,
        as: 'org_department_role',
        required: true,
        include: [
          {
            model: Role,
            as: 'role',
            required: true,
            where: { code: roleCode }
          }
        ]
      },
      {
        model: User,
        as: 'user',
        required: true,
        where: { is_active: true }
      }
    ]
  })

  return count > 0
}

async function findActiveUserIdsByRoleCode (roleCode) {
  if (!roleCode) {
    return []
  }

  const assignments = await UserRoleAssignment.findAll({
    where: { is_active: true },
    attributes: ['user_id'],
    include: [
      {
        model: OrgDeptRole,
        as: 'org_department_role',
        required: true,
        include: [
          {
            model: Role,
            as: 'role',
            required: true,
            where: { code: roleCode }
          }
        ]
      },
      {
        model: User,
        as: 'user',
        attributes: ['id'],
        required: true,
        where: { is_active: true }
      }
    ]
  })

  return [
    ...new Set(
      assignments
        .map(row => Number(row.user_id))
        .filter(id => Number.isInteger(id) && id > 0)
    )
  ]
}

module.exports = {
  userHasRoleCode,
  findActiveUserIdsByRoleCode
}
