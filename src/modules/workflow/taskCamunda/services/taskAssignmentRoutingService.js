'use strict'

const orgDeptRoleRepository = require('../../../organization/role/repositories/orgDeptRoleRepository')
const stageAssignmentRepository = require('../../stageConfig/repositories/stageAssignmentRepository')
const camundaClient = require('../../../../core/shared/clients/camunda/camundaClient')
const {
  getOrLoad,
  KEYS,
  invalidateStageAssignments
} = require('../../../../core/cache/apiCacheService')
const { API_CACHE_TTL_SECONDS } = require('../../../../core/config/env')
const { retryWithBackoff } = require('../../../../core/utils/retryWithBackoff')
const {
  ORG_DEP_ROLE_ASSIGNMENT_WIDGET_ID
} = require('../../stageConfig/validations/stageConfigSchema')

const ASSIGNEE_ROUTE_KEY = '__assignee_route'
const ORG_DEPT_ROLE_NOT_FOUND_MESSAGE = 'لم يتم العثور على وظيفة مثل التي ارسلت'

const normalizeOrgId = (value) =>
  value === 0 || value === '0' || value == null ? null : Number(value)

function normalizeRoleId (value) {
  if (value === 0 || value === '0' || value == null) {
    return null
  }

  const numeric = Number(value)
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null
}

function hasLegacyOrgDepRoleWidget (configJson = null) {
  const widget = configJson?.assignments

  return (
    widget?.widget_type === 'dropdown' &&
    widget?.data?.id === ORG_DEP_ROLE_ASSIGNMENT_WIDGET_ID
  )
}

function stageRequiresAssignmentSelection (configJson = null) {
  return configJson?.is_assignment === true || hasLegacyOrgDepRoleWidget(configJson)
}

function shapeAssignmentForPickup (assignment) {
  const odr = assignment.organization_department_role
  if (!odr) return null

  return {
    organization_id: odr.organization_id,
    organizationName: odr.organization?.name ?? null,
    department_id: odr.department_id,
    departmentName: odr.department?.name ?? null,
    role_id: odr.role_id,
    roleName: odr.role?.name ?? null,
    organization_department_roles_id: odr.id,
    camunda_group_key: odr.camunda_group_key ?? null
  }
}

async function loadStageAssignmentsForPickup (stageId) {
  if (!stageId) return []

  const rows = await stageAssignmentRepository.findDetailedByStageId(stageId)

  return rows.map(shapeAssignmentForPickup).filter(Boolean)
}

async function getCachedStageAssignmentsForPickup (stageId) {
  if (!stageId) return []

  return getOrLoad(
    KEYS.stageAssignments(stageId),
    () =>
      retryWithBackoff(() => loadStageAssignmentsForPickup(stageId), {
        label: `stage-assignments:${stageId}`
      }),
    {
      label: `stage-assignments:${stageId}`,
      ttlSeconds: API_CACHE_TTL_SECONDS
    }
  )
}

async function invalidateStageAssignmentsCache (stageId) {
  await invalidateStageAssignments(stageId)
}

function buildAssignmentsResponseFromConfig (configJson = null) {
  if (!stageRequiresAssignmentSelection(configJson)) {
    return null
  }

  return {
    is_assignment: true
  }
}

function extractSubmittedAssignmentItems (payload = {}) {
  if (!Array.isArray(payload.assignments)) {
    return []
  }

  return payload.assignments
}

async function resolveOrgDeptRoleFromAssignmentItem (item = {}) {
  const organizationId = normalizeOrgId(item.organization_id)
  const departmentId = normalizeOrgId(item.department_id)
  const roleId = normalizeRoleId(item.role_id)

  if (organizationId == null || departmentId == null || roleId == null) {
    return null
  }

  return orgDeptRoleRepository.findActiveByRoleOrgDept(
    roleId,
    organizationId,
    departmentId
  )
}

function buildOverrideTargetFromOrgDeptRole (orgDeptRole, submittedItem = {}) {
  return {
    organization_id: orgDeptRole.organization_id,
    department_id: orgDeptRole.department_id,
    role_id: orgDeptRole.role_id,
    organization_department_roles_id: orgDeptRole.id,
    camunda_group_key: orgDeptRole.camunda_group_key,
    submitted_assignment: {
      organization_id: normalizeOrgId(submittedItem.organization_id),
      department_id: normalizeOrgId(submittedItem.department_id),
      role_id: normalizeRoleId(submittedItem.role_id)
    }
  }
}

function createValidationError (message) {
  const error = new Error(message)
  error.code = 'VALIDATION_ERROR'
  error.statusCode = 400
  throw error
}

function createOrgDeptRoleNotFoundError () {
  const error = new Error(ORG_DEPT_ROLE_NOT_FOUND_MESSAGE)
  error.code = 'ORG_DEPT_ROLE_NOT_FOUND'
  error.statusCode = 400
  throw error
}

/**
 * إذا is_assignment=true: assignments[] مطلوب — [{ organization_id, department_id, role_id }]
 * يُطابق OrgDeptRole نشط. عند عدم التطابق → رسالة خطأ واضحة.
 */
async function resolveDestinationOverrideFromComplete ({
  payload = {},
  configJson = null,
  isReject = false
} = {}) {
  if (isReject || !stageRequiresAssignmentSelection(configJson)) {
    return null
  }

  const submittedItems = extractSubmittedAssignmentItems(payload)

  if (!submittedItems.length) {
    createValidationError(
      'assignments مطلوب — [{ organization_id, department_id, role_id }] لأن هذه المرحلة is_assignment=true'
    )
  }

  const submittedItem = submittedItems[0]
  const orgDeptRole = await resolveOrgDeptRoleFromAssignmentItem(submittedItem)

  if (!orgDeptRole) {
    createOrgDeptRoleNotFoundError()
  }

  return buildOverrideTargetFromOrgDeptRole(orgDeptRole, submittedItem)
}

async function resolveOrgDeptRolesForStage (stageId) {
  const rows = await stageAssignmentRepository.findDetailedByStageId(stageId)

  return rows
    .map(row => {
      const odr = row.organization_department_role
      if (!odr) return null
      return {
        organization_id: odr.organization_id,
        department_id: odr.department_id,
        role_id: odr.role_id,
        organization_department_roles_id: odr.id,
        camunda_group_key: odr.camunda_group_key
      }
    })
    .filter(Boolean)
}

async function applyCandidateGroupsToTask (taskId, groupKeys = []) {
  if (!taskId || !groupKeys.length) {
    return true
  }

  try {
    const existing = await camundaClient.getTaskIdentityLinks(taskId)
    const candidateLinks = (existing || []).filter(
      link => link.type === 'candidate' && link.groupId
    )

    for (const link of candidateLinks) {
      await camundaClient.deleteTaskIdentityLink(taskId, {
        type: 'candidate',
        groupId: link.groupId
      })
    }

    for (const groupId of [...new Set(groupKeys.filter(Boolean))]) {
      await camundaClient.addTaskIdentityLink(taskId, {
        type: 'candidate',
        groupId
      })
    }

    return true
  } catch (error) {
    console.warn(
      `[TaskAssignmentRouting] فشل ضبط candidate groups للمهمة ${taskId}: ${error.message}`
    )
    return false
  }
}

function clearAssigneeRoute (transactionData) {
  if (transactionData && ASSIGNEE_ROUTE_KEY in transactionData) {
    delete transactionData[ASSIGNEE_ROUTE_KEY]
  }
}

function storePendingAssigneeRoute (transactionData, overrideTarget) {
  transactionData[ASSIGNEE_ROUTE_KEY] = {
    status: 'pending',
    organization_department_roles_ids: [
      overrideTarget.organization_department_roles_id
    ],
    camunda_group_key: overrideTarget.camunda_group_key,
    submitted_assignment: overrideTarget.submitted_assignment
  }
}

function storeAppliedAssigneeRoute (transactionData, nextStage, overrideTarget) {
  transactionData[ASSIGNEE_ROUTE_KEY] = {
    status: 'applied',
    stage_code: nextStage.code,
    organization_department_roles_ids: [
      overrideTarget.organization_department_roles_id
    ],
    camunda_group_key: overrideTarget.camunda_group_key,
    submitted_assignment: overrideTarget.submitted_assignment
  }
}

async function applyStageAssignmentsFallback (nextTask, nextStage) {
  const targets = await resolveOrgDeptRolesForStage(nextStage.id)
  const groupKeys = targets.map(item => item.camunda_group_key).filter(Boolean)
  await applyCandidateGroupsToTask(nextTask.id, groupKeys)
  return targets
}

/**
 * يوجّه أول USER_TASK نشطة بعد complete:
 * - override من assignments[] المرسلة → OrgDeptRole
 * - عند فشل التطبيق → stage_assignments للمرحلة التالية
 * - بدون override → stage_assignments للمرحلة التالية
 */
async function routeNextUserTaskAssignments ({
  nextTask,
  nextStage,
  transactionData,
  overrideTarget = null
}) {
  if (!nextTask || !nextStage) {
    if (overrideTarget) {
      storePendingAssigneeRoute(transactionData, overrideTarget)
      return { routed: false, pending: true, assignments: [overrideTarget] }
    }

    clearAssigneeRoute(transactionData)
    return { routed: false, pending: false, assignments: [] }
  }

  if (nextStage.type && nextStage.type !== 'USER_TASK') {
    if (overrideTarget) {
      storePendingAssigneeRoute(transactionData, overrideTarget)
      return { routed: false, pending: true, assignments: [overrideTarget] }
    }

    clearAssigneeRoute(transactionData)
    return { routed: false, pending: false, assignments: [] }
  }

  if (overrideTarget) {
    const applied = await applyCandidateGroupsToTask(nextTask.id, [
      overrideTarget.camunda_group_key
    ])

    if (applied) {
      storeAppliedAssigneeRoute(transactionData, nextStage, overrideTarget)
      return {
        routed: true,
        pending: false,
        assignments: [overrideTarget],
        fallback: false
      }
    }

    const fallbackTargets = await applyStageAssignmentsFallback(nextTask, nextStage)
    clearAssigneeRoute(transactionData)

    return {
      routed: true,
      pending: false,
      assignments: fallbackTargets,
      fallback: true
    }
  }

  const targets = await resolveOrgDeptRolesForStage(nextStage.id)
  const groupKeys = targets.map(item => item.camunda_group_key).filter(Boolean)
  await applyCandidateGroupsToTask(nextTask.id, groupKeys)
  clearAssigneeRoute(transactionData)

  return { routed: true, pending: false, assignments: targets, fallback: false }
}

async function routeNextTaskAssignments (args) {
  return routeNextUserTaskAssignments(args)
}

function userMatchesAssigneeRoute (roleIds, transactionData, stageCode) {
  const route = transactionData?.[ASSIGNEE_ROUTE_KEY]

  if (
    !route ||
    route.status === 'pending' ||
    route.stage_code !== stageCode ||
    !Array.isArray(route.organization_department_roles_ids)
  ) {
    return null
  }

  const allowed = new Set(
    route.organization_department_roles_ids.map(Number).filter(Boolean)
  )

  return roleIds.some(id => allowed.has(Number(id)))
}

module.exports = {
  ASSIGNEE_ROUTE_KEY,
  ORG_DEP_ROLE_ASSIGNMENT_WIDGET_ID,
  ORG_DEPT_ROLE_NOT_FOUND_MESSAGE,
  getCachedStageAssignmentsForPickup,
  loadStageAssignmentsForPickup,
  stageRequiresAssignmentSelection,
  buildAssignmentsResponseFromConfig,
  resolveDestinationOverrideFromComplete,
  resolveOrgDeptRolesForStage,
  routeNextUserTaskAssignments,
  routeNextTaskAssignments,
  userMatchesAssigneeRoute,
  invalidateStageAssignmentsCache
}
