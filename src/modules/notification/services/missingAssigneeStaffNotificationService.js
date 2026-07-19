'use strict'

const { Op } = require('sequelize')
const {
  UserRoleAssignment,
  OrgDeptRole,
  Organization,
  Department,
  Role,
  User
} = require('../../../entities')
const {
  findActiveUserIdsByRoleCode
} = require('../repositories/notificationRecipientRepository')
const { deliverNotificationToUser } = require('./notificationDeliveryService')
const processRepository = require('../../workflow/processDefinition/repositories/processRepository')
const {
  getOrLoad,
  KEYS
} = require('../../../core/cache/apiCacheService')
const { API_CACHE_TTL_SECONDS } = require('../../../core/config/env')

const TECHNICAL_OFFICER_ROLE = 'TECHNICAL_OFFICER'
const NOTIFICATION_TYPE = 'next_stage_no_assignee_staff'

function normalizeOdrIds (ids = []) {
  return [
    ...new Set(
      ids.map(Number).filter(id => Number.isInteger(id) && id > 0)
    )
  ]
}

async function resolveProcessName ({
  processDefinition = null,
  transaction = null,
  processDefinitionId = null
} = {}) {
  if (processDefinition?.name) {
    return processDefinition.name
  }

  if (transaction?.id_process) {
    return transaction.id_process
  }

  const id = processDefinitionId || processDefinition?.id

  if (id) {
    const process = await processRepository.findById(id)

    if (process?.name) {
      return process.name
    }
  }

  return transaction?.code || String(transaction?.id || 'معاملة')
}

/**
 * استعلام واحد: أي OrgDepRole من القائمة لا يملك موظفاً نشطاً في user_role_assignments.
 */
async function findOrgDeptRolesMissingActiveUsers (orgDeptRoleIds = []) {
  const ids = normalizeOdrIds(orgDeptRoleIds)

  if (!ids.length) {
    return []
  }

  const coveredRows = await UserRoleAssignment.findAll({
    where: {
      is_active: true,
      organization_department_roles_id: { [Op.in]: ids }
    },
    attributes: ['organization_department_roles_id'],
    include: [
      {
        model: User,
        as: 'user',
        required: true,
        attributes: [],
        where: { is_active: true }
      }
    ],
    raw: true
  })

  const covered = new Set(
    coveredRows.map(row => Number(row.organization_department_roles_id))
  )
  const missingIds = ids.filter(id => !covered.has(id))

  if (!missingIds.length) {
    return []
  }

  return OrgDeptRole.findAll({
    where: { id: { [Op.in]: missingIds } },
    attributes: [
      'id',
      'organization_id',
      'department_id',
      'role_id',
      'camunda_group_key'
    ],
    include: [
      { model: Organization, as: 'organization', attributes: ['id', 'name'] },
      { model: Department, as: 'department', attributes: ['id', 'name'] },
      { model: Role, as: 'role', attributes: ['id', 'name', 'code'] }
    ]
  })
}

async function getCachedTechnicalOfficerUserIds () {
  return getOrLoad(
    KEYS.technicalOfficerUserIds(),
    () => findActiveUserIdsByRoleCode(TECHNICAL_OFFICER_ROLE),
    {
      label: 'technical-officer-user-ids',
      ttlSeconds: API_CACHE_TTL_SECONDS
    }
  )
}

function buildMissingAssigneeMessage ({
  stageName,
  processName,
  organizationName,
  departmentName,
  roleName
}) {
  return (
    `المرحلة (${stageName}) المعاملة (${processName}) ` +
    `لا يوجد موظف تابع للمنظمة (${organizationName}) ` +
    `ضمن الدائرة (${departmentName}) للدور (${roleName})`
  )
}

/**
 * تحقق خفيف بعد توجيه USER_TASK التالية:
 * إن لم يوجد موظف لأي OrgDepRole مستهدف → إشعار المسؤولين التقنيين (WebSocket).
 * يُستدعى fire-and-forget ولا يحجب مسار complete.
 */
async function notifyTechnicalOfficersIfNoAssigneeStaff ({
  targets = [],
  nextStage = null,
  transaction = null,
  processInstance = null,
  processDefinition = null,
  processDefinitionId = null,
  sentByUserId = null
} = {}) {
  const odrIds = targets
    .map(item => item.organization_department_roles_id)
    .filter(Boolean)

  if (!odrIds.length || !nextStage) {
    return { notified: false, reason: 'nothing_to_check' }
  }

  const missingRoles = await findOrgDeptRolesMissingActiveUsers(odrIds)

  if (!missingRoles.length) {
    return { notified: false, reason: 'staff_present' }
  }

  const officerIds = await getCachedTechnicalOfficerUserIds()

  if (!officerIds.length) {
    console.warn(
      '[MissingAssigneeStaff] لا يوجد مسؤول تقني نشط لإشعاره بعدم وجود موظف للمرحلة التالية'
    )
    return { notified: false, reason: 'no_technical_officers' }
  }

  const stageName = nextStage.name || nextStage.code || 'غير محددة'
  const processName = await resolveProcessName({
    processDefinition,
    transaction,
    processDefinitionId:
      processDefinitionId || processInstance?.process_definition_id || null
  })

  const deliveries = []

  for (const odr of missingRoles) {
    const organizationName = odr.organization?.name || String(odr.organization_id)
    const departmentName = odr.department?.name || String(odr.department_id)
    const roleName = odr.role?.name || String(odr.role_id)
    const message = buildMissingAssigneeMessage({
      stageName,
      processName,
      organizationName,
      departmentName,
      roleName
    })

    const data = {
      type: NOTIFICATION_TYPE,
      transactionId: String(transaction?.id || ''),
      idProcess: transaction?.id_process || '',
      processName,
      stageId: String(nextStage.id || ''),
      stageCode: nextStage.code || '',
      stageName,
      organizationId: String(odr.organization_id || ''),
      organizationName,
      departmentId: String(odr.department_id || ''),
      departmentName,
      roleId: String(odr.role_id || ''),
      roleName,
      organizationDepartmentRolesId: String(odr.id),
      camundaGroupKey: odr.camunda_group_key || '',
      audience: 'technical_officer'
    }

    for (const officerId of officerIds) {
      deliveries.push(
        deliverNotificationToUser({
          userId: officerId,
          sentByUserId,
          title: 'لا يوجد موظف لاستلام المرحلة التالية',
          message,
          type: NOTIFICATION_TYPE,
          transactionId: transaction?.id || null,
          processInstanceId: processInstance?.id || null,
          data
        })
      )
    }
  }

  await Promise.allSettled(deliveries)

  return {
    notified: true,
    missingCount: missingRoles.length,
    officers: officerIds.length
  }
}

/**
 * جدولة غير حاجزة — لا تؤخر استجابة complete.
 */
function scheduleNotifyTechnicalOfficersIfNoAssigneeStaff (payload) {
  setImmediate(() => {
    notifyTechnicalOfficersIfNoAssigneeStaff(payload).catch(error => {
      console.warn(
        `[MissingAssigneeStaff] فشل إشعار المسؤول التقني: ${error.message}`
      )
    })
  })
}

module.exports = {
  NOTIFICATION_TYPE,
  findOrgDeptRolesMissingActiveUsers,
  notifyTechnicalOfficersIfNoAssigneeStaff,
  scheduleNotifyTechnicalOfficersIfNoAssigneeStaff,
  buildMissingAssigneeMessage
}
