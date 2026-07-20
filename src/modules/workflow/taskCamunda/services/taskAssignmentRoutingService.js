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

function getConfigAssignmentsWidget (configJson = null) {
  return configJson?.assignments || null
}

/**
 * يعيد assignments كما في stageConfig + value (للـ GET/pickup).
 */
function buildAssignmentsResponseFromConfig (configJson = null, value = '') {
  const widget = getConfigAssignmentsWidget(configJson)

  if (!widget) {
    return null
  }

  return {
    widget_type: widget.widget_type || 'dropdown',
    data: {
      id: widget.data?.id || ORG_DEP_ROLE_ASSIGNMENT_WIDGET_ID,
      label: widget.data?.label ?? null,
      is_required: widget.data?.is_required !== false,
      options: Array.isArray(widget.data?.options)
        ? widget.data.options.map(option => ({
          key: option.key,
          value: option.value
        }))
        : []
    },
    value: value == null ? '' : String(value)
  }
}

function extractOrgDepRoleDestinationValue (payload = {}) {
  if (payload?.assignments != null) {
    if (typeof payload.assignments === 'string') {
      return String(payload.assignments).trim()
    }

    if (
      payload.assignments.value != null &&
      payload.assignments.value !== ''
    ) {
      return String(payload.assignments.value).trim()
    }
  }

  const fromWidgets = (payload.widgets || []).find(
    widget => widget?.data?.id === ORG_DEP_ROLE_ASSIGNMENT_WIDGET_ID
  )

  if (fromWidgets?.value != null && fromWidgets.value !== '') {
    return String(fromWidgets.value).trim()
  }

  return null
}

/**
 * إذا كانت المرحلة تحتوي config_json.assignments:
 * - يجب إرسال assignments بنفس الهيكل الكامل + value
 * - value يجب أن تطابق options[].key و camunda_group_key نشط
 */
async function resolveDestinationOverrideFromComplete ({
  payload = {},
  configJson = null,
  isReject = false
} = {}) {
  if (isReject) {
    return null
  }

  const assignmentWidget = getConfigAssignmentsWidget(configJson)

  if (!assignmentWidget) {
    return null
  }

  const submitted = payload.assignments

  if (!submitted || typeof submitted !== 'object' || Array.isArray(submitted)) {
    const error = new Error(
      `assignments مطلوب بنفس شكل stageConfig (widget_type, data, value) لأن هذه المرحلة تحتوي config_json.assignments`
    )
    error.code = 'VALIDATION_ERROR'
    error.statusCode = 400
    throw error
  }

  if (submitted.widget_type !== 'dropdown') {
    const error = new Error('assignments.widget_type يجب أن يكون dropdown')
    error.code = 'VALIDATION_ERROR'
    error.statusCode = 400
    throw error
  }

  if (submitted.data?.id !== ORG_DEP_ROLE_ASSIGNMENT_WIDGET_ID) {
    const error = new Error(
      `assignments.data.id يجب أن يكون ${ORG_DEP_ROLE_ASSIGNMENT_WIDGET_ID}`
    )
    error.code = 'VALIDATION_ERROR'
    error.statusCode = 400
    throw error
  }

  const selectedKey = extractOrgDepRoleDestinationValue(payload)

  if (!selectedKey) {
    const error = new Error(
      `assignments.value مطلوب للودجت ${ORG_DEP_ROLE_ASSIGNMENT_WIDGET_ID}`
    )
    error.code = 'VALIDATION_ERROR'
    error.statusCode = 400
    throw error
  }

  const configOptions = assignmentWidget.data?.options || []
  const matchedConfigOption = configOptions.find(
    option => String(option.key).trim() === selectedKey
  )

  if (!matchedConfigOption) {
    const error = new Error('الوجهة التالية التي ارسلتها غير موجودة')
    error.code = 'NEXT_DESTINATION_NOT_FOUND'
    error.statusCode = 400
    throw error
  }

  const submittedOptions = Array.isArray(submitted.data?.options)
    ? submitted.data.options
    : []
  const matchedSubmittedOption = submittedOptions.find(
    option => String(option.key).trim() === selectedKey
  )

  if (!matchedSubmittedOption) {
    const error = new Error(
      'assignments.value يجب أن يطابق key ضمن assignments.data.options المرسلة'
    )
    error.code = 'VALIDATION_ERROR'
    error.statusCode = 400
    throw error
  }

  const orgDeptRole =
    await orgDeptRoleRepository.findActiveByCamundaGroupKey(selectedKey)

  if (!orgDeptRole) {
    const error = new Error('الوجهة التالية التي ارسلتها غير موجودة')
    error.code = 'NEXT_DESTINATION_NOT_FOUND'
    error.statusCode = 400
    throw error
  }

  return {
    organization_id: orgDeptRole.organization_id,
    department_id: orgDeptRole.department_id,
    role_id: orgDeptRole.role_id,
    organization_department_roles_id: orgDeptRole.id,
    camunda_group_key: orgDeptRole.camunda_group_key,
    selected_key: selectedKey,
    selected_label: matchedConfigOption.value ?? matchedSubmittedOption.value ?? null
  }
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
  if (!taskId || !groupKeys.length) return

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
  } catch (error) {
    console.warn(
      `[TaskAssignmentRouting] فشل ضبط candidate groups للمهمة ${taskId}: ${error.message}`
    )
  }
}

function clearAssigneeRoute (transactionData) {
  if (transactionData && ASSIGNEE_ROUTE_KEY in transactionData) {
    delete transactionData[ASSIGNEE_ROUTE_KEY]
  }
}

/**
 * يوجّه أول USER_TASK نشطة بعد complete:
 * - إن وُجد override (من OrgDepRole dropdown) → يُطبَّق عليه
 * - وإلا → stage_assignments للمرحلة التالية
 * - إن لم تظهر USER_TASK بعد (SERVICE_TASK/gateway) → يُحفظ التوجيه معلّقاً (pending)
 */
async function routeNextUserTaskAssignments ({
  nextTask,
  nextStage,
  transactionData,
  overrideTarget = null
}) {
  if (!nextTask || !nextStage) {
    if (overrideTarget) {
      transactionData[ASSIGNEE_ROUTE_KEY] = {
        status: 'pending',
        organization_department_roles_ids: [
          overrideTarget.organization_department_roles_id
        ],
        camunda_group_key: overrideTarget.camunda_group_key,
        selected_key: overrideTarget.selected_key,
        selected_label: overrideTarget.selected_label
      }
      return { routed: false, pending: true, assignments: [overrideTarget] }
    }

    clearAssigneeRoute(transactionData)
    return { routed: false, pending: false, assignments: [] }
  }

  if (nextStage.type && nextStage.type !== 'USER_TASK') {
    if (overrideTarget) {
      transactionData[ASSIGNEE_ROUTE_KEY] = {
        status: 'pending',
        organization_department_roles_ids: [
          overrideTarget.organization_department_roles_id
        ],
        camunda_group_key: overrideTarget.camunda_group_key,
        selected_key: overrideTarget.selected_key,
        selected_label: overrideTarget.selected_label
      }
      return { routed: false, pending: true, assignments: [overrideTarget] }
    }

    clearAssigneeRoute(transactionData)
    return { routed: false, pending: false, assignments: [] }
  }

  let targets = []

  if (overrideTarget) {
    targets = [overrideTarget]
    await applyCandidateGroupsToTask(nextTask.id, [
      overrideTarget.camunda_group_key
    ])

    transactionData[ASSIGNEE_ROUTE_KEY] = {
      status: 'applied',
      stage_code: nextStage.code,
      organization_department_roles_ids: [
        overrideTarget.organization_department_roles_id
      ],
      camunda_group_key: overrideTarget.camunda_group_key,
      selected_key: overrideTarget.selected_key,
      selected_label: overrideTarget.selected_label
    }
  } else {
    targets = await resolveOrgDeptRolesForStage(nextStage.id)
    const groupKeys = targets.map(item => item.camunda_group_key).filter(Boolean)
    await applyCandidateGroupsToTask(nextTask.id, groupKeys)
    clearAssigneeRoute(transactionData)
  }

  return { routed: true, pending: false, assignments: targets }
}

/** توافق خلفي مع الاسم السابق */
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
  getCachedStageAssignmentsForPickup,
  loadStageAssignmentsForPickup,
  getConfigAssignmentsWidget,
  buildAssignmentsResponseFromConfig,
  extractOrgDepRoleDestinationValue,
  resolveDestinationOverrideFromComplete,
  resolveOrgDeptRolesForStage,
  routeNextUserTaskAssignments,
  routeNextTaskAssignments,
  userMatchesAssigneeRoute,
  invalidateStageAssignmentsCache
}
