'use strict'

const processInstanceStageRepository =
  require('../../../transaction/process_instance_stage/repositories/processInstanceStageRepository')
const employeeRepository = require('../../employee/repositories/employeeRepository')
const {
  ensureSelfCardForUser,
  findHistoryBySource,
  createHistoryRow,
  updateProfileHeader,
  HISTORY_MODELS,
  PROFILE_FIELDS
} = require('../repositories/employeeSelfCardRepository')

const VALID_TARGETS = new Set([
  'profile_header',
  ...Object.keys(HISTORY_MODELS)
])

function createSyncError (message, code = 'VALIDATION_ERROR') {
  const err = new Error(message)
  err.code = code
  return err
}

function widgetsToValueMap (stageData = {}) {
  const values = {}

  for (const widget of stageData.widgets || []) {
    const id = widget?.data?.id ?? widget?.id ?? widget?.key
    if (id == null) continue
    values[String(id)] = widget.value
  }

  for (const field of stageData.fields || []) {
    const key = field?.key ?? field?.id
    if (key == null) continue
    if (!Object.prototype.hasOwnProperty.call(values, key)) {
      values[String(key)] = field.value
    }
  }

  return values
}

function pickMappedFields (valueMap, fieldMap = {}) {
  const mapped = {}

  for (const [column, widgetId] of Object.entries(fieldMap || {})) {
    if (!widgetId) continue
    if (!Object.prototype.hasOwnProperty.call(valueMap, String(widgetId))) {
      continue
    }
    mapped[column] = valueMap[String(widgetId)]
  }

  return mapped
}

function normalizeTitle (title) {
  return String(title || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

async function resolveSourceStageData ({
  transactionId,
  sourceStage,
  serviceStageCode
}) {
  const sealedRows = await processInstanceStageRepository.findSealedByTransactionId(
    transactionId
  )

  const plainRows = (sealedRows || []).map(row =>
    typeof row.get === 'function' ? row.get({ plain: true }) : row
  )

  if (!plainRows.length) {
    throw createSyncError(
      'لا توجد لقطة مختومة لقراءة بيانات SYNC_SELF_CARD',
      'SEALED_SNAPSHOT_MISSING'
    )
  }

  if (sourceStage && sourceStage !== 'PREVIOUS_USER_TASK') {
    const exact = plainRows.find(row => row.stage_code === sourceStage)
    if (!exact) {
      throw createSyncError(
        `اللقطة المختومة للمرحلة "${sourceStage}" غير موجودة`,
        'SEALED_SNAPSHOT_MISSING'
      )
    }
    return exact
  }

  const candidates = plainRows
    .filter(row => row.stage_code !== serviceStageCode)
    .sort((a, b) => {
      const aTime = new Date(a.sealed_at || a.created_at || 0).getTime()
      const bTime = new Date(b.sealed_at || b.created_at || 0).getTime()
      return bTime - aTime
    })

  if (!candidates.length) {
    throw createSyncError(
      'تعذّر إيجاد USER_TASK مختوم كمصدر لـ SYNC_SELF_CARD',
      'SEALED_SNAPSHOT_MISSING'
    )
  }

  return candidates[0]
}

async function resolveEmployeeUserId ({
  payload,
  valueMap
}) {
  const mode = String(payload.employee_user_id_from || 'WIDGET').toUpperCase()

  if (mode !== 'WIDGET') {
    throw createSyncError(
      'employee_user_id_from يجب أن يكون WIDGET فقط (اختيار الموظف عبر employee_picker)'
    )
  }

  const widgetId = payload.employee_user_id_widget || 'employee_user_id'
  const raw = valueMap[String(widgetId)]
  const userId = Number(
    raw && typeof raw === 'object'
      ? (raw.user_id ?? raw.id ?? raw.value ?? raw.key)
      : raw
  )

  if (!Number.isInteger(userId) || userId < 1) {
    throw createSyncError(
      `قيمة employee_picker (${widgetId}) مطلوبة ويجب أن تكون user_id موجباً`
    )
  }

  return userId
}

async function assertAdministrativeEmployee (userId) {
  const employee = await employeeRepository.findEmployeeById(userId)
  const assignments = employee?.role_assignments || []
  const isAdminEmployee = assignments.some(assignment => {
    const key = assignment?.org_department_role?.camunda_group_key
    return key && key !== 'CITIZEN'
  })

  if (!employee || !isAdminEmployee) {
    throw createSyncError(
      `المستخدم #${userId} ليس موظفاً إدارياً — البطاقة الذاتية للموظفين فقط`,
      'FORBIDDEN'
    )
  }
}

/**
 * يزامن البطاقة الذاتية من لقطة مرحلة مختومة.
 */
async function syncSelfCardFromSealedStage ({
  payload = {},
  transaction,
  serviceStage = null,
  registeredByUserId = null
}) {
  const target = String(payload.target || '').trim()

  if (!VALID_TARGETS.has(target)) {
    throw createSyncError(
      `SYNC_SELF_CARD payload.target غير صالح — المسموح: ${[...VALID_TARGETS].join(', ')}`
    )
  }

  const transactionId = Number(transaction?.id)

  if (!Number.isInteger(transactionId) || transactionId < 1) {
    throw createSyncError('transaction مطلوب لتنفيذ SYNC_SELF_CARD')
  }

  const sourceRow = await resolveSourceStageData({
    transactionId,
    sourceStage: payload.source_stage || 'PREVIOUS_USER_TASK',
    serviceStageCode: serviceStage?.code || null
  })

  const valueMap = widgetsToValueMap(sourceRow.data || {})
  const employeeUserId = await resolveEmployeeUserId({
    payload,
    valueMap
  })

  await assertAdministrativeEmployee(employeeUserId)

  const mapped = pickMappedFields(valueMap, payload.field_map || {})
  const selfCard = await ensureSelfCardForUser(employeeUserId)

  if (target === 'profile_header') {
    const updated = await updateProfileHeader(selfCard, mapped)
    return {
      status: 'updated',
      target,
      self_card_id: updated.id,
      employee_user_id: employeeUserId,
      source_stage_code: sourceRow.stage_code,
      source_content_hash: sourceRow.content_hash || null
    }
  }

  const existing = await findHistoryBySource({
    target,
    sourceTransactionId: transactionId,
    sourceStageCode: sourceRow.stage_code
  })

  if (existing) {
    return {
      status: 'skipped_duplicate',
      target,
      self_card_id: selfCard.id,
      employee_user_id: employeeUserId,
      history_id: existing.id,
      source_stage_code: sourceRow.stage_code,
      source_content_hash: sourceRow.content_hash || null
    }
  }

  const rowPayload = {
    self_card_id: selfCard.id,
    source_transaction_id: transactionId,
    source_stage_code: sourceRow.stage_code,
    source_content_hash: sourceRow.content_hash || null,
    registered_by: registeredByUserId || null
  }

  const Model = HISTORY_MODELS[target]
  const allowedColumns = new Set(Object.keys(Model.rawAttributes || {}))

  for (const [key, value] of Object.entries(mapped)) {
    if (allowedColumns.has(key)) {
      rowPayload[key] = value
    }
  }

  if (target === 'training_course') {
    if (!rowPayload.title) {
      throw createSyncError('title مطلوب لـ training_course')
    }
    rowPayload.normalized_title = normalizeTitle(rowPayload.title)
  }

  if (target === 'reward' && !rowPayload.reward_type) {
    throw createSyncError('reward_type مطلوب لـ reward')
  }

  if (target === 'sanction' && !rowPayload.sanction_type) {
    throw createSyncError('sanction_type مطلوب لـ sanction')
  }

  if (target === 'leave' && !rowPayload.leave_type) {
    throw createSyncError('leave_type مطلوب لـ leave')
  }

  const created = await createHistoryRow({
    target,
    payload: rowPayload
  })

  return {
    status: 'created',
    target,
    self_card_id: selfCard.id,
    employee_user_id: employeeUserId,
    history_id: created.id,
    source_stage_code: sourceRow.stage_code,
    source_content_hash: sourceRow.content_hash || null
  }
}

module.exports = {
  VALID_TARGETS,
  syncSelfCardFromSealedStage,
  ensureSelfCardForUser,
  widgetsToValueMap,
  pickMappedFields
}
