'use strict'

/**
 * تجميع بيانات مسح QR العامة بعد نجاح verifyDocumentQr:
 * موقّعون + طالب المعاملة + تواريخ + final_document + transaction_history
 */

const processRepository = require('../../../workflow/processDefinition/repositories/processRepository')
const documentInstanceRepository = require('../../document/repositories/documentInstanceRepository')
const documentFinalTransactionRepository =
  require('../../certificate/repositories/documentFinalTransactionRepository')
const transactionSignatureLinkRepository =
  require('../repositories/transactionSignatureLinkRepository')
const {
  formatTransactionHistoryForDisplay,
  enrichHistoryTemplatesWithDocumentInstances
} = require('../../../workflow/taskCamunda/utils/transactionHistoryDisplay')
const {
  normalizeProcessPriority,
  formatTransactionDate
} = require('../../../workflow/taskCamunda/utils/employeeTaskFormatters')
const { toPublicFileUrl } = require('../../../../core/utils/filePath')

function mapIdentityPerson (source = {}) {
  return {
    first_name: source.first_name ?? null,
    last_name: source.last_name ?? null,
    father_name: source.father_name ?? null,
    mother_name: source.mother_name ?? null,
    national_id: source.national_id ?? null
  }
}

function mapSignerRow (link) {
  const user = link.digital_signature?.user_key?.user || {}

  return {
    signature_order: link.signature_order,
    stage_code: link.stage_code ?? null,
    signed_at: link.signed_at ?? link.digital_signature?.signed_at ?? null,
    user_id: link.digital_signature?.user_key?.user_id ?? user.id ?? null,
    first_name: user.first_name ?? null,
    last_name: user.last_name ?? null,
    father_name: user.father_name ?? null,
    mother_name: user.mother_name ?? null,
    national_id: user.national_id ?? null
  }
}

function mapFinalDocumentPublic (row) {
  if (!row) {
    return {
      available: false,
      message: 'لم يتم توليد الوثيقة النهائية لهذه المعاملة بعد'
    }
  }

  return {
    available: true,
    id: row.id,
    file_path: row.file_path,
    file_url: toPublicFileUrl(row.file_path),
    original_name: row.original_name ?? null,
    mime_type: row.mime_type ?? null,
    file_size_bytes: row.file_size_bytes ?? null,
    generated_at: row.generated_at ?? null
  }
}

function resolveStatusDates (transaction) {
  const status = transaction.status
  const updatedAt = formatTransactionDate(transaction.updated_at)

  return {
    request_date: formatTransactionDate(transaction.created_at),
    completed_at: status === 'completed' ? updatedAt : null,
    rejected_at: status === 'rejected' ? updatedAt : null
  }
}

/**
 * يبني حمولة عامة غنية لمسح QR — يُستدعى فقط بعد التحقق من صحة التوقيع/السلسلة.
 */
async function buildDocumentQrScanBundle (transaction) {
  if (!transaction) {
    return null
  }

  const transactionId = transaction.id

  const [process, documentInstances, finalDocument, signerLinks] =
    await Promise.all([
      transaction.code
        ? processRepository.findByCode(transaction.code)
        : null,
      documentInstanceRepository.findAllByTransactionId(transactionId),
      documentFinalTransactionRepository.findByTransactionIdCached(transactionId),
      transactionSignatureLinkRepository.findSignersWithIdentityByTransactionId(
        transactionId
      )
    ])

  const historyData = enrichHistoryTemplatesWithDocumentInstances(
    formatTransactionHistoryForDisplay(transaction.data || {}, transaction),
    documentInstances
  )

  const dates = resolveStatusDates(transaction)

  return {
    transaction: {
      id: transaction.id,
      id_process: transaction.id_process ?? null,
      status: transaction.status,
      process_name: process?.name ?? null,
      request_date: dates.request_date,
      completed_at: dates.completed_at,
      rejected_at: dates.rejected_at
    },
    applicant: mapIdentityPerson(transaction),
    signers: (signerLinks || []).map(mapSignerRow),
    transaction_history: {
      id_process: transaction.id_process ?? null,
      priority: normalizeProcessPriority(process?.priority),
      data: historyData
    },
    final_document: mapFinalDocumentPublic(finalDocument)
  }
}

module.exports = {
  buildDocumentQrScanBundle,
  mapIdentityPerson,
  mapSignerRow,
  mapFinalDocumentPublic
}
