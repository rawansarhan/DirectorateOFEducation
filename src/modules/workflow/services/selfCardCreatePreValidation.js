'use strict'

/**
 * يتحقق مبكراً قبل complete/submit إن كانت المرحلة الحالية
 * تغذي SYNC_SELF_CARD target=profile_header — يمنع قبول المعاملة عند تكرار.
 */

const stageRepository = require('../processDefinition/repositories/stageRepository')
const stageConfigRepository = require('../stageConfig/repositories/stageConfigRepository')
const {
  widgetsToValueMap,
  pickMappedFields,
  normalizeProfileMappedFields
} = require('../../organization/selfCard/services/syncSelfCardService')
const {
  assertSelfCardUniqueFields
} = require('../../organization/selfCard/services/selfCardUniquenessService')

function payloadToValueMap (payload = {}) {
  if (Array.isArray(payload.widgets) && payload.widgets.length) {
    return widgetsToValueMap({ widgets: payload.widgets })
  }

  if (Array.isArray(payload.fields) && payload.fields.length) {
    return widgetsToValueMap({ fields: payload.fields })
  }

  return {}
}

async function findProfileHeaderCreateActions (processDefinitionId) {
  if (!processDefinitionId) {
    return []
  }

  const stages = await stageRepository.findByProcessDefinitionId(
    processDefinitionId
  )

  const actions = []

  for (const stage of stages || []) {
    if (stage.type !== 'SERVICE_TASK') {
      continue
    }

    const stageConfig = await stageConfigRepository.findByStageId(stage.id)
    const configActions = stageConfig?.config_json?.actions || []

    for (const action of configActions) {
      if (
        action?.name === 'SYNC_SELF_CARD' &&
        String(action?.payload?.target || '').trim() === 'profile_header'
      ) {
        actions.push({
          stageCode: stage.code,
          payload: action.payload || {}
        })
      }
    }
  }

  return actions
}

/**
 * إن وُجدت خدمة إنشاء بطاقة ذاتية في العملية، تحقق من تفرّد الحقول
 * من قيم الفورم الحالي قبل قبول complete/submit.
 */
async function assertUpcomingSelfCardCreateUniqueness ({
  processDefinitionId,
  formPayload = {}
} = {}) {
  const createActions = await findProfileHeaderCreateActions(processDefinitionId)

  if (!createActions.length) {
    return
  }

  const valueMap = payloadToValueMap(formPayload)

  for (const action of createActions) {
    const mapped = normalizeProfileMappedFields(
      pickMappedFields(valueMap, action.payload.field_map || {})
    )

    // لا نفحص إن لم تُرسل أي حقول فريدة من الـ field_map بعد
    const hasAnyUniqueCandidate =
      mapped.user_id != null ||
      mapped.self_number != null ||
      mapped.national_id != null ||
      mapped.insurance_number != null

    if (!hasAnyUniqueCandidate) {
      continue
    }

    await assertSelfCardUniqueFields(mapped)
  }
}

module.exports = {
  findProfileHeaderCreateActions,
  assertUpcomingSelfCardCreateUniqueness
}
