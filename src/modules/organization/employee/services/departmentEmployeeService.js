'use strict'

const departmentEmployeeRepository = require('../repositories/departmentEmployeeRepository')
const employeeTaskRepository = require('../../../workflow/taskCamunda/repositories/employeeTaskRepository')
const { toDepartmentEmployeeDTO } = require('../mappers/employeeMapper')
const {
  encodeCursor,
  buildCursorPaginationMeta,
  emptyCursorPaginatedResult
} = require('../../../../core/utils/pagination')
const {
  getOrLoad,
  KEYS
} = require('../../../../core/cache/apiCacheService')
const { EMPLOYEE_TASKS_CACHE_TTL_SECONDS } = require('../../../../core/config/env')

function fail (message, statusCode = 400, code = 'VALIDATION_ERROR') {
  const err = new Error(message)
  err.statusCode = statusCode
  err.code = code
  return err
}

function parseDepartmentIds ({ query = {} } = {}) {
  const rawParts = []
  const fromQuery = query.department_ids ?? query.department_id

  if (fromQuery != null && String(fromQuery).trim() !== '') {
    if (Array.isArray(fromQuery)) {
      rawParts.push(...fromQuery.map(value => String(value).trim()))
    } else {
      rawParts.push(...String(fromQuery).split(','))
    }
  }

  const departmentIds = [
    ...new Set(
      rawParts
        .map(part => String(part).trim())
        .filter(Boolean)
        .map(part => parseInt(part, 10))
        .filter(id => Number.isInteger(id) && id >= 1)
    )
  ]

  if (!departmentIds.length) {
    throw fail(
      'department_ids مطلوب — مثال: ?department_ids=1 أو ?department_ids=1,2,3'
    )
  }

  return departmentIds
}

function buildAssignmentCursor (assignment) {
  return encodeCursor({
    k: 'dept_emp',
    id: assignment.id
  })
}

function computeWorkloadPercent ({
  orgDeptRoleId,
  userId,
  inProgressByOdrUser,
  pendingByOdr,
  employeesPerOdr
}) {
  const inProgress = inProgressByOdrUser.get(`${orgDeptRoleId}:${userId}`) || 0
  const pendingPool = pendingByOdr.get(orgDeptRoleId) || 0
  const employeeCount = Math.max(1, employeesPerOdr.get(orgDeptRoleId) || 1)

  let totalInProgress = 0

  for (const [key, count] of inProgressByOdrUser.entries()) {
    if (key.startsWith(`${orgDeptRoleId}:`)) {
      totalInProgress += count
    }
  }

  const pendingShare = pendingPool / employeeCount
  const employeeActive = inProgress + pendingShare
  const totalActive = totalInProgress + pendingPool
  const activeTotal = Math.round((inProgress + pendingShare) * 10) / 10

  if (totalActive <= 0) {
    return {
      in_progress: inProgress,
      pending_pickup: pendingPool,
      active_total: 0,
      workload_percent: 0
    }
  }

  const workloadPercent = Math.round((employeeActive / totalActive) * 100)

  return {
    in_progress: inProgress,
    pending_pickup: pendingPool,
    active_total: activeTotal,
    workload_percent: Math.min(100, Math.max(0, workloadPercent))
  }
}

async function loadDepartmentEmployees ({
  userId,
  departmentIds,
  cursor = null,
  decodedCursor = null,
  limit,
  search = null
}) {
  const access = await employeeTaskRepository.userHasDepartmentsAccess(
    userId,
    departmentIds
  )

  if (!access.allowed) {
    throw fail(
      `لا تملك صلاحية الوصول للدوائر: ${access.deniedIds.join(', ')}`,
      403,
      'FORBIDDEN'
    )
  }

  if (decodedCursor && decodedCursor.k !== 'dept_emp') {
    throw fail('cursor غير صالح لهذا البحث')
  }

  const { rows, hasNext } =
    await departmentEmployeeRepository.findAssignmentsByDepartments({
      departmentIds,
      cursor: decodedCursor,
      limit,
      search
    })

  if (!rows.length) {
    return emptyCursorPaginatedResult({ limit, cursor })
  }

  const orgDeptRoleIds = [
    ...new Set(rows.map(row => row.organization_department_roles_id))
  ]
  const userIds = [...new Set(rows.map(row => row.user_id))]

  const stageIdsByOdr =
    await departmentEmployeeRepository.getStageIdsByOrgDeptRoleIds(orgDeptRoleIds)

  const allStageIds = [
    ...new Set(
      [...stageIdsByOdr.values()].flat()
    )
  ]

  const [completedMap, runningInstances, employeesPerOdr] = await Promise.all([
    departmentEmployeeRepository.countCompletedStagesByUsersAndOdrs({
      userIds,
      orgDeptRoleIds
    }),
    departmentEmployeeRepository.getRunningInstancesForStageIds(allStageIds),
    departmentEmployeeRepository.countEmployeesByOrgDeptRoleIds(orgDeptRoleIds)
  ])

  const stageToOdrs = departmentEmployeeRepository.buildStageToOdrMap(stageIdsByOdr)
  const { inProgressByOdrUser, pendingByOdr } =
    departmentEmployeeRepository.aggregateActiveTasks({
      instances: runningInstances,
      stageToOdrs
    })

  const items = rows.map(assignment => {
    const workload = computeWorkloadPercent({
      orgDeptRoleId: assignment.organization_department_roles_id,
      userId: assignment.user_id,
      inProgressByOdrUser,
      pendingByOdr,
      employeesPerOdr
    })

    const completedCount =
      completedMap.get(
        `${assignment.organization_department_roles_id}:${assignment.user_id}`
      ) || 0

    return toDepartmentEmployeeDTO({
      assignment,
      completedCount,
      workload
    })
  })

  const nextCursor =
    hasNext && rows.length ? buildAssignmentCursor(rows[rows.length - 1]) : null

  return {
    items,
    pagination: buildCursorPaginationMeta({
      limit,
      cursor,
      nextCursor,
      hasNext
    })
  }
}

async function getDepartmentEmployeesService ({
  userId,
  departmentIds,
  cursor = null,
  decodedCursor = null,
  limit,
  search = null
}) {
  const cacheKey = KEYS.employeesByDepartments(
    userId,
    departmentIds,
    cursor,
    limit,
    search
  )

  return getOrLoad(
    cacheKey,
    () => loadDepartmentEmployees({
      userId,
      departmentIds,
      cursor,
      decodedCursor,
      limit,
      search
    }),
    {
      label: `employees:by-depts:${userId}`,
      // عبء العمل حيّ — لا نستخدم API_CACHE_TTL الطويل (ساعة)
      ttlSeconds: EMPLOYEE_TASKS_CACHE_TTL_SECONDS
    }
  )
}

module.exports = {
  parseDepartmentIds,
  getDepartmentEmployeesService
}
