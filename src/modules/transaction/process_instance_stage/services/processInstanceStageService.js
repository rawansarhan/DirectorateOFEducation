'use strict'

const processInstanceStageRepository =
  require('../repositories/processInstanceStageRepository')
const {
  computeStageDataHash
} = require('../../integrityChain/utils/integrityChainUtils')

const AUTH_ROOT_KEYS = [
  'stage_name',
  'form_id',
  'form_name',
  'widgets',
  'templates',
  'decision',
  'note'
]

function createSealedStageError (stageCode) {
  const error = new Error(
    `لا يمكن تعديل بيانات مرحلة مكتملة ومختومة (${stageCode})`
  )
  error.code = 'STAGE_SEALED'
  return error
}

async function createProcessStage ({
  transactionId,
  stageCode,
  stageName,
  status,
  data,
  assigned_to,
  contentHash = null,
  challengeId = null,
  sealed = null
}, { transaction: dbTransaction } = {}) {
  const existing = await processInstanceStageRepository
    .findByTransactionAndStageCode(transactionId, stageCode, dbTransaction)

  const shouldSeal = sealed != null
    ? Boolean(sealed)
    : (status === 'completed' || status === 'rejected')

  const resolvedHash = contentHash || (
    data && typeof data === 'object'
      ? computeStageDataHash(data)
      : null
  )

  if (existing?.sealed) {
    return existing
  }

  if (existing) {
    return existing.update({
      status,
      data,
      assigned_to,
      content_hash: resolvedHash,
      sealed: shouldSeal,
      sealed_at: shouldSeal ? new Date() : null,
      challenge_id: challengeId || existing.challenge_id
    }, { transaction: dbTransaction })
  }

  return processInstanceStageRepository.create({
    transaction_id: transactionId,
    stage_code: stageCode,
    stage_name: stageName,
    status,
    data,
    assigned_to,
    content_hash: resolvedHash,
    sealed: shouldSeal,
    sealed_at: shouldSeal ? new Date() : null,
    challenge_id: challengeId
  }, dbTransaction)
}

function restoreAuthRootFields (incomingData, existingData) {
  const next = { ...incomingData }

  for (const key of AUTH_ROOT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(existingData || {}, key)) {
      next[key] = existingData[key]
    }
  }

  return next
}

const PDF_META_KEYS = [
  'id_document_instance',
  'generated_pdf_path',
  'generated_pdf_url'
]

function mergePdfMetaOntoSealedStage (sealedStage, incomingStage) {
  if (!incomingStage || typeof incomingStage !== 'object') {
    return sealedStage
  }

  const merged = { ...sealedStage }

  for (const key of PDF_META_KEYS) {
    if (Object.prototype.hasOwnProperty.call(incomingStage, key)) {
      merged[key] = incomingStage[key]
    }
  }

  if (Array.isArray(incomingStage.templates) && Array.isArray(sealedStage.templates)) {
    merged.templates = sealedStage.templates.map(sealedItem => {
      const sealedId = Number(
        sealedItem?.id_template ?? sealedItem?.id ?? sealedItem?.template_id
      )
      const incomingItem = incomingStage.templates.find(item => {
        const id = Number(item?.id_template ?? item?.id ?? item?.template_id)
        return id === sealedId
      })

      if (!incomingItem) {
        return sealedItem
      }

      const sealedValue = {
        ...(sealedItem.values || sealedItem.value || {})
      }
      const incomingValue = incomingItem.values || incomingItem.value || {}

      for (const key of PDF_META_KEYS) {
        if (Object.prototype.hasOwnProperty.call(incomingValue, key)) {
          sealedValue[key] = incomingValue[key]
        }
      }

      return {
        ...sealedItem,
        value: sealedValue,
        values: sealedValue
      }
    })
  } else if (Array.isArray(incomingStage.templates) && !sealedStage.templates) {
    // root AUTH: merge pdf meta into root templates if present on incoming only
    merged.templates = incomingStage.templates
  }

  return merged
}

async function freezeSealedStageData ({
  transactionId,
  incomingData,
  existingData,
  allowStageCode = null,
  dbTransaction = null
}) {
  const sealedRows = await processInstanceStageRepository
    .findSealedByTransactionId(transactionId, dbTransaction)

  if (!sealedRows.length) {
    return incomingData
  }

  let next = { ...(incomingData || {}) }
  const source = existingData && typeof existingData === 'object' ? existingData : {}

  for (const row of sealedRows) {
    if (allowStageCode && row.stage_code === allowStageCode) {
      continue
    }

    const nestedExisting = source[row.stage_code]
    const nestedIncoming = next[row.stage_code]

    if (nestedExisting && typeof nestedExisting === 'object') {
      if (
        nestedIncoming &&
        computeStageDataHash(nestedIncoming) !== computeStageDataHash(nestedExisting)
      ) {
        throw createSealedStageError(row.stage_code)
      }

      next[row.stage_code] = mergePdfMetaOntoSealedStage(
        nestedExisting,
        nestedIncoming
      )
      continue
    }

    const sealedSnapshot = row.data && typeof row.data === 'object' ? row.data : {}
    const looksLikeAuthRoot = AUTH_ROOT_KEYS.some(key =>
      Object.prototype.hasOwnProperty.call(source, key) ||
      Object.prototype.hasOwnProperty.call(sealedSnapshot, key)
    )

    if (!looksLikeAuthRoot) {
      continue
    }

    const incomingRootHash = computeStageDataHash({
      form_id: next.form_id,
      form_name: next.form_name,
      widgets: next.widgets,
      templates: next.templates,
      decision: next.decision,
      note: next.note
    })
    const sealedHash = row.content_hash || computeStageDataHash(sealedSnapshot)

    if (
      (next.widgets || next.form_id) &&
      incomingRootHash !== sealedHash &&
      computeStageDataHash({
        form_id: source.form_id,
        form_name: source.form_name,
        widgets: source.widgets,
        templates: source.templates,
        decision: source.decision,
        note: source.note
      }) === sealedHash
    ) {
      throw createSealedStageError(row.stage_code)
    }

    const restoredBase = source.widgets || source.form_id ? source : sealedSnapshot
    next = restoreAuthRootFields(next, restoredBase)
    next = mergePdfMetaOntoSealedStage(next, incomingData)
  }

  return next
}

module.exports = {
  createProcessStage,
  freezeSealedStageData
}
