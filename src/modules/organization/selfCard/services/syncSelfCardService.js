'use strict'

const processInstanceStageRepository =
  require('../../../transaction/process_instance_stage/repositories/processInstanceStageRepository')
const {
  findSelfCardById,
  findHistoryBySource,
  createHistoryRow,
  createSelfCard,
  updateProfileHeader,
  HISTORY_MODELS
} = require('../repositories/employeeSelfCardRepository')
const { invalidateSelfCards } = require('../../../../core/cache/apiCacheService')
const { extractSelfCardId } = require('../../../../core/utils/employeePickerValue')

const VALID_TARGETS = new Set([
  'profile_header',
  'update_profile_header',
  ...Object.keys(HISTORY_MODELS)
])

function createSyncError (message, code = 'VALIDATION_ERROR', statusCode = 400) {
  const err = new Error(message)
  err.code = code
  err.statusCode = statusCode
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

/**
 * يحوّل قيمة widget (نص / مصفوفة / {key,value}) إلى قيمة مناسبة لأعمدة البطاقة.
 */
function scalarizeWidgetValue (value) {
  if (value === undefined) {
    return undefined
  }

  if (value === null || value === '') {
    return null
  }

  if (Array.isArray(value)) {
    const parts = value
      .map(item => scalarizeWidgetValue(item))
      .filter(item => item != null && item !== '')
    return parts.length ? parts.join(', ') : null
  }

  if (typeof value === 'object') {
    if (value.value != null && value.value !== '') {
      return String(value.value)
    }
    if (value.key != null && value.key !== '') {
      return String(value.key)
    }
    if (value.label != null && value.label !== '') {
      return String(value.label)
    }
    return null
  }

  return value
}

/**
 * يحوّل قيم check_list / dropdown إلى نص مناسب لأعمدة البطاقة الذاتية.
 */
function normalizeProfileMappedFields (mapped = {}) {
  const out = {}

  for (const [key, value] of Object.entries(mapped)) {
    if (value === undefined) continue
    out[key] = scalarizeWidgetValue(value)
  }

  return out
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

/**
 * يقرأ self_card_id من employee_picker / self_card_picker.
 * يدعم الحقل الجديد self_card_id_widget والقديم employee_user_id_widget.
 */
async function resolveSelfCardId ({ payload, valueMap }) {
  const mode = String(payload.employee_user_id_from || 'WIDGET').toUpperCase()

  if (mode !== 'WIDGET') {
    throw createSyncError(
      'employee_user_id_from يجب أن يكون WIDGET فقط (اختيار البطاقة عبر employee_picker)'
    )
  }

  const widgetId =
    payload.self_card_id_widget ||
    payload.employee_user_id_widget ||
    'self_card_id'

  const raw = valueMap[String(widgetId)]
  const selfCardId = extractSelfCardId(raw)

  if (!Number.isInteger(selfCardId) || selfCardId < 1) {
    throw createSyncError(
      `قيمة employee_picker (${widgetId}) مطلوبة ويجب أن تحتوي self_card_id موجباً`
    )
  }

  return selfCardId
}

async function assertSelfCardWritable (selfCardId) {
  const selfCard = await findSelfCardById(selfCardId, { withHistory: false })

  if (!selfCard) {
    throw createSyncError(
      `البطاقة الذاتية #${selfCardId} غير موجودة`,
      'NOT_FOUND',
      404
    )
  }

  if (selfCard.is_active === false) {
    throw createSyncError(
      `البطاقة الذاتية #${selfCardId} غير نشطة`,
      'FORBIDDEN',
      403
    )
  }

  return selfCard
}

async function createProfileHeaderFromMapped (mapped) {
  if (!mapped.full_name && !mapped.national_id) {
    throw createSyncError(
      'لإنشاء بطاقة ذاتية (profile_header) يلزم full_name أو national_id في field_map'
    )
  }

  try {
    return await createSelfCard(mapped)
  } catch (err) {
    if (err?.code === 'CONFLICT') {
      throw createSyncError(
        err.message,
        'CONFLICT',
        err.statusCode || 409
      )
    }

    if (err?.name === 'SequelizeUniqueConstraintError') {
      throw createSyncError(
        'قد تم إنشاء بطاقة ذاتية بنفس الحقل الفريد (user_id / الرقم الوطني / الرقم الذاتي / الرقم التأميني)',
        'CONFLICT',
        409
      )
    }

    if (err?.code === 'VALIDATION_ERROR') {
      throw createSyncError(err.message, 'VALIDATION_ERROR')
    }

    throw err
  }
}

/**
 * يزامن البطاقة الذاتية من لقطة مرحلة مختومة.
 *
 * targets:
 * - profile_header         → إنشاء بطاقة جديدة (بدون self_card_id)
 * - update_profile_header  → تعديل بطاقة موجودة (يتطلب employee_picker / self_card_id)
 * - باقي الـ targets       → سجلات تاريخية على بطاقة موجودة
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
  const mapped = normalizeProfileMappedFields(
    pickMappedFields(valueMap, payload.field_map || {})
  )

  // إنشاء بطاقة ذاتية للمرة الأولى — بدون self_card_id
  if (target === 'profile_header') {
    const created = await createProfileHeaderFromMapped(mapped)
    const plain =
      typeof created?.get === 'function' ? created.get({ plain: true }) : created

    await invalidateSelfCards(plain.id)

    return {
      status: 'created',
      target,
      self_card_id: plain.id,
      employee_user_id: plain.user_id ?? null,
      source_stage_code: sourceRow.stage_code,
      source_content_hash: sourceRow.content_hash || null
    }
  }

  // تعديل البيانات الأساسية — يتطلب self_card_id من employee_picker
  if (target === 'update_profile_header') {
    const selfCardId = await resolveSelfCardId({ payload, valueMap })
    const selfCard = await assertSelfCardWritable(selfCardId)
    const updated = await updateProfileHeader(selfCard, mapped)
    const plain =
      typeof updated?.get === 'function' ? updated.get({ plain: true }) : updated

    await invalidateSelfCards(plain.id)

    return {
      status: 'updated',
      target,
      self_card_id: plain.id,
      employee_user_id: plain.user_id ?? null,
      source_stage_code: sourceRow.stage_code,
      source_content_hash: sourceRow.content_hash || null
    }
  }

  // سجلات تاريخية — تتطلب بطاقة موجودة
  const selfCardId = await resolveSelfCardId({ payload, valueMap })
  const selfCard = await assertSelfCardWritable(selfCardId)

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
      employee_user_id: selfCard.user_id ?? null,
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

  await invalidateSelfCards(selfCard.id)

  return {
    status: 'created',
    target,
    self_card_id: selfCard.id,
    employee_user_id: selfCard.user_id ?? null,
    history_id: created.id,
    source_stage_code: sourceRow.stage_code,
    source_content_hash: sourceRow.content_hash || null
  }
}

module.exports = {
  VALID_TARGETS,
  syncSelfCardFromSealedStage,
  widgetsToValueMap,
  pickMappedFields,
  normalizeProfileMappedFields
}
