'use strict'

/**
 * أقل تعقيد: للعرض فقط — استبدل بيانات المراحل المختومة فوق transactions.data
 * حتى GET history/certificate/task-details تعرض اللقطة المختومة لا النسخة الحية المعدَّلة.
 */

const processInstanceStageRepository =
  require('../repositories/processInstanceStageRepository')

const ROOT_FORM_KEYS = [
  'stage_name',
  'form_id',
  'form_name',
  'widgets',
  'templates',
  'decision',
  'note',
  'completed_by',
  'completed_at'
]

function toPlain (row) {
  if (!row) return null
  return typeof row.get === 'function' ? row.get({ plain: true }) : row
}

function withSealMeta (snapshot = {}, plain) {
  return {
    ...snapshot,
    sealed: true,
    content_hash: plain.content_hash || null,
    challenge_id: plain.challenge_id || null,
    stage_code: plain.stage_code || snapshot.stage_code || null,
    stage_name: snapshot.stage_name || plain.stage_name || null
  }
}

function looksLikeFormSnapshot (data = {}) {
  return Boolean(
    data.form_id ||
    (Array.isArray(data.widgets) && data.widgets.length) ||
    (Array.isArray(data.templates) && data.templates.length)
  )
}

/**
 * يبني نسخة عرض من live data مع استبدال كل مرحلة sealed من process_instance_stage.
 */
function overlaySealedStageDataForDisplay (liveData = {}, sealedRows = []) {
  if (!sealedRows?.length) {
    return liveData && typeof liveData === 'object' ? { ...liveData } : {}
  }

  const next = { ...(liveData || {}) }

  for (const row of sealedRows) {
    const plain = toPlain(row)
    if (!plain?.stage_code) continue

    const snapshot = withSealMeta(
      plain.data && typeof plain.data === 'object' ? plain.data : {},
      plain
    )

    if (next[plain.stage_code] && typeof next[plain.stage_code] === 'object') {
      next[plain.stage_code] = snapshot
      continue
    }

    // AUTH غالباً على جذر transactions.data
    if (looksLikeFormSnapshot(snapshot) && looksLikeFormSnapshot(next)) {
      for (const key of ROOT_FORM_KEYS) {
        if (Object.prototype.hasOwnProperty.call(snapshot, key)) {
          next[key] = snapshot[key]
        }
      }
      next.sealed = true
      next.content_hash = plain.content_hash || null
      next.challenge_id = plain.challenge_id || null
      next.stage_code = plain.stage_code
      continue
    }

    if (looksLikeFormSnapshot(snapshot)) {
      next[plain.stage_code] = snapshot
    }
  }

  return next
}

async function getTransactionDataForDisplay (transaction, { dbTransaction = null } = {}) {
  const liveData = transaction?.data && typeof transaction.data === 'object'
    ? transaction.data
    : {}

  const transactionId = transaction?.id
  if (!transactionId) {
    return { ...liveData }
  }

  const sealedRows = await processInstanceStageRepository.findSealedByTransactionId(
    transactionId,
    dbTransaction
  )

  return overlaySealedStageDataForDisplay(liveData, sealedRows)
}

module.exports = {
  overlaySealedStageDataForDisplay,
  getTransactionDataForDisplay
}
