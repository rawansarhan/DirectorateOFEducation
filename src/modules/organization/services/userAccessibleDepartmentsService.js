'use strict'

const { Op } = require('sequelize')

const { Department } = require('../../../entities')
const orgDeptRoleRepository = require('../repositories/orgDeptRoleRepository')
const userRoleAssignmentRepository =
  require('../../auth/repositories/userRoleAssignmentRepository')
const {
  KEYS,
  getOrLoad
} = require('../../../core/cache/apiCacheService')

async function resolveActiveRootOdrIds (userId, providedRoots = null) {
  if (Array.isArray(providedRoots) && providedRoots.length) {
    return [...new Set(providedRoots.map(id => Number(id)).filter(id => id > 0))]
  }

  const assignments = await userRoleAssignmentRepository.findActiveRolesByUserId(userId)

  return [...new Set(
    assignments.map(row => row.organization_department_roles_id)
  )]
}

async function loadAccessibleScopeFromDb (rootOdrIds) {
  const subtreeRows = await orgDeptRoleRepository.findDescendantSubtreeByRootIds(rootOdrIds)

  const orgDeptRoleIds = [...new Set(subtreeRows.map(row => Number(row.id)))]
  const departmentIds = [...new Set(
    subtreeRows
      .map(row => Number(row.department_id))
      .filter(id => id > 0)
  )]

  if (!departmentIds.length) {
    return {
      root_org_dept_role_ids: rootOdrIds,
      org_dept_role_ids: orgDeptRoleIds,
      department_ids: [],
      departments: []
    }
  }

  const departments = await Department.findAll({
    where: {
      id: { [Op.in]: departmentIds },
      is_active: true
    },
    attributes: ['id', 'name', 'organization_id', 'parent_id', 'is_active'],
    order: [['name', 'ASC']]
  })

  return {
    root_org_dept_role_ids: rootOdrIds,
    org_dept_role_ids: orgDeptRoleIds,
    department_ids: departmentIds,
    departments: departments.map(dept => ({
      id: dept.id,
      name: dept.name,
      organization_id: dept.organization_id,
      parent_id: dept.parent_id,
      is_active: dept.is_active
    }))
  }
}

async function getUserAccessibleDepartments (userId, options = {}) {
  const numericUserId = Number(userId)

  if (!Number.isInteger(numericUserId) || numericUserId < 1) {
    const err = new Error('معرّف المستخدم غير صالح')
    err.statusCode = 400
    throw err
  }

  return getOrLoad(
    KEYS.userAccessibleDepartments(numericUserId),
    async () => {
      const rootOdrIds = await resolveActiveRootOdrIds(
        numericUserId,
        options.rootOdrIds
      )

      if (!rootOdrIds.length) {
        return {
          root_org_dept_role_ids: [],
          org_dept_role_ids: [],
          department_ids: [],
          departments: []
        }
      }

      return loadAccessibleScopeFromDb(rootOdrIds)
    },
    { label: `user accessible departments ${numericUserId}` }
  )
}

async function getAccessibleDepartmentIdsForUser (userId, options = {}) {
  const scope = await getUserAccessibleDepartments(userId, options)
  return scope.department_ids
}

module.exports = {
  getUserAccessibleDepartments,
  getAccessibleDepartmentIdsForUser
}
