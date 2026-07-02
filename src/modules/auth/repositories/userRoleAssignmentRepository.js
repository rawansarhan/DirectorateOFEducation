'use strict'

const { UserRoleAssignment, OrgDeptRole } = require('../../../entities')

class UserRoleAssignmentRepository {
  async create (data, options = {}) {
    return UserRoleAssignment.create(data, options)
  }

  async findActiveRolesByUserId (userId) {
    return UserRoleAssignment.findAll({
      where: {
        user_id: userId,
        is_active: true
      },
      attributes: ['organization_department_roles_id']
    })
  }

  async findActiveWithOrgDeptRole (userId) {
    return UserRoleAssignment.findAll({
      where: {
        user_id: userId,
        is_active: true
      },
      include: [{
        model: OrgDeptRole,
        as: 'org_department_role',
        attributes: ['id', 'camunda_group_key']
      }]
    })
  }

  // تعطيل كل تعيينات الأدوار الفعّالة لمستخدم (يُستخدم عند إعادة التعيين)
  async deactivateAllByUserId (userId, options = {}) {
    return UserRoleAssignment.update(
      { is_active: false },
      {
        where: { user_id: userId, is_active: true },
        ...options
      }
    )
  }
}

module.exports = new UserRoleAssignmentRepository()
