'use strict'

/**
 * قراءة قيم المراحل من اللقطات المختومة فقط (process_instance_stage.sealed).
 * تُستخدم في GENERATE_PDF والوثيقة النهائية بدل transactions.data الحي.
 */

const processInstanceStageRepository =
  require('../../process_instance_stage/repositories/processInstanceStageRepository')
const {
  stageDataHashMatches
} = require('../utils/integrityChainUtils')
const {
  stripPdfMetaFromTemplateValues
} = require('../../../workflow/taskCamunda/utils/generatedPdfHistory')

function createSealedSnapshotError (code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

function toPlainRow (row) {
  if (!row) return null
  return typeof row.get === 'function' ? row.get({ plain: true }) : row
}

function widgetsToValueMap (widgets = []) {
  const values = {}

  for (const widget of widgets || []) {
    const id = widget?.data?.id ?? widget?.id ?? widget?.key
    if (id == null) continue
    values[id] = widget.value
  }

  return values
}

function extractTemplateValuesFromList (templates, templateId) {
  for (const item of templates || []) {
    const id = Number(item?.id_template ?? item?.id ?? item?.template_id)

    if (id !== Number(templateId)) {
      continue
    }

    if (Array.isArray(item.widgets) && item.widgets.length) {
      return stripPdfMetaFromTemplateValues(widgetsToValueMap(item.widgets))
    }

    const values = item.values ?? item.value ?? null

    if (values && typeof values === 'object') {
      return stripPdfMetaFromTemplateValues(values)
    }
  }

  return null
}

function findTemplateValuesInStageData (stageData, templateId) {
  if (!stageData || typeof stageData !== 'object') {
    return null
  }

  return extractTemplateValuesFromList(stageData.templates, templateId)
}

/**
 * يتحقق أن كل لقطة مختومة لم تُعبث (content_hash يطابق البيانات).
 */
async function assertSealedRowsIntact (transactionId, { dbTransaction = null } = {}) {
  const rows = await processInstanceStageRepository.findSealedByTransactionId(
    transactionId,
    dbTransaction
  )

  const intact = []

  for (const row of rows) {
    const plain = toPlainRow(row)
    const data = plain.data && typeof plain.data === 'object' ? plain.data : {}
    const storedHash = plain.content_hash || null

    if (!storedHash) {
      throw createSealedSnapshotError(
        'SEALED_SNAPSHOT_TAMPERED',
        `مرحلة مختومة بدون content_hash (${plain.stage_code}) — أعد إكمال المرحلة`
      )
    }

    if (!stageDataHashMatches(data, storedHash)) {
      throw createSealedSnapshotError(
        'SEALED_SNAPSHOT_TAMPERED',
        `تم التلاعب بلقطة المرحلة المختومة (${plain.stage_code}) — الهاش لا يطابق البيانات`
      )
    }

    intact.push({
      stage_code: plain.stage_code,
      stage_name: plain.stage_name,
      content_hash: storedHash,
      challenge_id: plain.challenge_id || null,
      sealed_at: plain.sealed_at || null,
      data
    })
  }

  return intact
}

/**
 * يستخرج قيم قالب من اللقطات المختومة فقط (بدون transactions.data).
 */
async function resolveTemplateValuesFromSealedStages (
  transactionId,
  templateId,
  { dbTransaction = null } = {}
) {
  const sealed = await assertSealedRowsIntact(transactionId, { dbTransaction })

  if (!sealed.length) {
    return {
      values: null,
      source: null,
      sealed_count: 0
    }
  }

  for (const row of sealed) {
    const values = findTemplateValuesInStageData(row.data, templateId)

    if (values) {
      return {
        values,
        source: {
          stage_code: row.stage_code,
          content_hash: row.content_hash,
          challenge_id: row.challenge_id
        },
        sealed_count: sealed.length
      }
    }
  }

  return {
    values: null,
    source: null,
    sealed_count: sealed.length
  }
}

function collectSourceSealFingerprints (sealedRows = []) {
  return (sealedRows || []).map(row => ({
    stage_code: row.stage_code,
    content_hash: row.content_hash,
    challenge_id: row.challenge_id || null,
    sealed_at: row.sealed_at || null
  }))
}

/**
 * قبل الوثيقة النهائية: السلسلة يجب ألا تكون مزوّرة.
 * incomplete (بدون روابط) مسموح لمسار المواطن بدون USB.
 */
async function assertIntegrityReadyForFinalDocument (transactionId) {
  const { verifyIntegrityChain } = require('./integrityChainService')
  const chain = await verifyIntegrityChain(transactionId)

  if (chain.chain_status === 'forged' || (chain.valid === false && chain.total_links > 0)) {
    throw createSealedSnapshotError(
      'INTEGRITY_CHAIN_FORGED',
      'سلسلة النزاهة مزوّرة أو تالفة — لا يمكن توليد الوثيقة النهائية'
    )
  }

  return chain
}

/**
 * قبل GENERATE_PDF / الدمج النهائي: ختم سليم + (للنهائي) سلسلة غير مزوّرة.
 */
async function loadSealedSourceForDocumentGeneration (
  transactionId,
  { requireIntegrityChain = false } = {}
) {
  const sealed = await assertSealedRowsIntact(transactionId)

  let chain = null
  if (requireIntegrityChain) {
    chain = await assertIntegrityReadyForFinalDocument(transactionId)
  }

  return {
    sealed,
    source_seal_hashes: collectSourceSealFingerprints(sealed),
    chain
  }
}

module.exports = {
  assertSealedRowsIntact,
  resolveTemplateValuesFromSealedStages,
  collectSourceSealFingerprints,
  assertIntegrityReadyForFinalDocument,
  loadSealedSourceForDocumentGeneration,
  findTemplateValuesInStageData,
  extractTemplateValuesFromList
}
