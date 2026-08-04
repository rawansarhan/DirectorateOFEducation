'use strict'

const {
  UserRoleAssignment,
  RolePermission,
  Permission,
  OrgDeptRole
} = require('../../entities')

/**
 * مصدر الحقيقة الوحيد لتحديد ما هو "فعّال" في طبقة الصلاحيات.
 * التعيين يُحتسب فقط إذا كان مفعّلاً هو نفسه وكان الدور المرتبط به مفعّلاً أيضاً.
 */
const ACTIVE_ORG_DEPT_ROLE_INCLUDE = {
  model: OrgDeptRole,
  as: 'org_department_role',
  attributes: [],
  where: { is_active: true },
  required: true
}

/**
 * معرّفات organization_department_roles الفعّالة للمستخدم.
 * تستبعد التعيينات المعطّلة والأدوار المعطّلة.
 */
async function findActiveOrgDeptRoleIdsByUserId (userId) {
  const assignments = await UserRoleAssignment.findAll({
    where: {
      user_id: userId,
      is_active: true
    },
    attributes: ['organization_department_roles_id'],
    include: [ACTIVE_ORG_DEPT_ROLE_INCLUDE]
  })

  return [
    ...new Set(
      assignments
        .map(row => row.organization_department_roles_id)
        .filter(Boolean)
    )
  ]
}

/**
 * أسماء الصلاحيات لمجموعة ODRs.
 * يفلتر مرة أخرى على is_active لأن المعرّفات قد تصل من مصدر غير مفلتر.
 */
async function findPermissionNamesByOrgDeptRoleIds (orgDeptRoleIds = []) {
  if (!orgDeptRoleIds.length) {
    return []
  }

  const rows = await RolePermission.findAll({
    where: {
      organization_department_roles_id: orgDeptRoleIds
    },
    include: [
      {
        model: Permission,
        as: 'permissions',
        attributes: ['code'],
        required: true
      },
      {
        model: OrgDeptRole,
        as: 'orgDeptRole',
        attributes: [],
        where: { is_active: true },
        required: true
      }
    ]
  })

  return [
    ...new Set(
      rows
        .map(row => row.permissions?.code)
        .filter(Boolean)
    )
  ]
}

/**
 * معرّفات المستخدمين المعيّنين على ODR معيّن — بغض النظر عن حالة التفعيل،
 * لأنها تُستخدم لإبطال الكاش ويجب أن تشمل من تم تعطيله للتو.
 */
async function findUserIdsByOrgDeptRoleId (organizationDepartmentRolesId) {
  if (organizationDepartmentRolesId == null) {
    return []
  }

  const assignments = await UserRoleAssignment.findAll({
    where: {
      organization_department_roles_id: organizationDepartmentRolesId
    },
    attributes: ['user_id']
  })

  return [
    ...new Set(
      assignments
        .map(row => row.user_id)
        .filter(Boolean)
    )
  ]
}

module.exports = {
  findActiveOrgDeptRoleIdsByUserId,
  findPermissionNamesByOrgDeptRoleIds,
  findUserIdsByOrgDeptRoleId
}
